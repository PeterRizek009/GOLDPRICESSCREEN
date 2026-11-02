
import { createClient } from "npm:@supabase/supabase-js@2";

const API_URL = "https://api.goldprice.dev/v1/prices";
const GRAMS_PER_OUNCE = 31.1034768;
const DEFAULT_USD_AED = 3.6725;
const API_TIMEOUT_MS = 15000;

type Metal = "gold" | "silver";

type ApiQuote = {
  symbol: string;
  quote_currency: string;
  unit: string;
  contract_type: string;
  price: string | number;
  is_stale?: boolean;
  computed_at: string;
};

type MarketRow = {
  metal: Metal;
  spot_usd_oz: number;
  bid_usd_oz: null;
  ask_usd_oz: null;
  low_usd_oz: null;
  high_usd_oz: null;
  price_gram_aed: number;
  usd_aed_rate: number;
  source: string;
  updated_at: string;
};

function logInfo(
  event: string,
  details: Record<string, unknown> = {}
) {
  console.log(
    JSON.stringify({
      level: "INFO",
      event,
      timestamp: new Date().toISOString(),
      ...details,
    })
  );
}

function logError(
  event: string,
  details: Record<string, unknown> = {}
) {
  console.error(
    JSON.stringify({
      level: "ERROR",
      event,
      timestamp: new Date().toISOString(),
      ...details,
    })
  );
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

// -------------------------------
// Authentication
// -------------------------------

function verifyAuthorization(request: Request): {
  valid: boolean;
  reason: string;
} {
  const expectedSecret = Deno.env.get(
    "MARKET_REFRESH_SECRET"
  );

  const authorization = request.headers.get(
    "Authorization"
  );

  if (!expectedSecret) {
    logError("AUTH_CONFIGURATION_MISSING", {
      secretConfigured: false,
    });

    return {
      valid: false,
      reason: "Server authentication is not configured",
    };
  }

  if (!authorization) {
    logError("AUTH_HEADER_MISSING", {
      secretConfigured: true,
      authorizationPresent: false,
    });

    return {
      valid: false,
      reason: "Authorization header missing",
    };
  }

  if (!authorization.startsWith("Bearer ")) {
    logError("AUTH_HEADER_INVALID_FORMAT", {
      secretConfigured: true,
      authorizationPresent: true,
      bearerPrefixCorrect: false,
    });

    return {
      valid: false,
      reason: "Invalid authorization format",
    };
  }

  if (authorization !== `Bearer ${expectedSecret}`) {
    logError("AUTH_SECRET_MISMATCH", {
      secretConfigured: true,
      authorizationPresent: true,
      bearerPrefixCorrect: true,
    });

    return {
      valid: false,
      reason: "Invalid authentication secret",
    };
  }

  logInfo("AUTH_SUCCESS");

  return {
    valid: true,
    reason: "Authorized",
  };
}

// -------------------------------
// External Market Data
// -------------------------------

async function fetchPrices(): Promise<ApiQuote[]> {
  const apiKey = Deno.env.get("GOLDPRICE_API_KEY");

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  logInfo("MARKET_API_REQUEST_STARTED", {
    provider: "goldprice.dev",
  });

  const response = await fetch(API_URL, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });

  if (!response.ok) {
    logError("MARKET_API_HTTP_ERROR", {
      status: response.status,
    });

    throw new Error(
      `Market provider returned HTTP ${response.status}`
    );
  }

  const data: unknown = await response.json();

  if (
    !data ||
    typeof data !== "object" ||
    !("symbols" in data) ||
    !Array.isArray(data.symbols)
  ) {
    throw new Error(
      "Invalid market API response: symbols array missing"
    );
  }

  logInfo("MARKET_API_RESPONSE_RECEIVED", {
    quotesCount: data.symbols.length,
  });

  return data.symbols as ApiQuote[];
}

// -------------------------------
// Price Validation
// -------------------------------

function getMetalQuote(
  quotes: ApiQuote[],
  symbol: "XAU" | "XAG"
): ApiQuote {
  const quote = quotes.find(
    (item) =>
      item.symbol === symbol &&
      item.quote_currency === "USD" &&
      item.unit === "troy_ounce" &&
      item.contract_type === "spot"
  );

  if (!quote) {
    throw new Error(
      `Missing ${symbol}/USD spot price`
    );
  }

  const price = Number(quote.price);

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Invalid ${symbol} price`);
  }

  if (
    !quote.computed_at ||
    Number.isNaN(Date.parse(quote.computed_at))
  ) {
    throw new Error(`Invalid ${symbol} timestamp`);
  }

  if (quote.is_stale === true) {
    throw new Error(
      `${symbol} market data is marked stale by provider`
    );
  }

  return quote;
}

// -------------------------------
// Price Calculations
// -------------------------------

function buildRow(
  metal: Metal,
  quote: ApiQuote,
  usdAed: number
): MarketRow {
  const spot = Number(quote.price);

  const gramAed =
    (spot / GRAMS_PER_OUNCE) * usdAed;

  return {
    metal,
    spot_usd_oz: spot,
    bid_usd_oz: null,
    ask_usd_oz: null,
    low_usd_oz: null,
    high_usd_oz: null,
    price_gram_aed: Number(gramAed.toFixed(4)),
    usd_aed_rate: usdAed,
    source: "goldprice.dev",
    updated_at: new Date(
      quote.computed_at
    ).toISOString(),
  };
}

// -------------------------------
// Database Connection
// -------------------------------

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");

  const serviceRoleKey = Deno.env.get(
    "SUPABASE_SERVICE_ROLE_KEY"
  );

  if (!supabaseUrl || !serviceRoleKey) {
    logError("SUPABASE_CONFIGURATION_MISSING", {
      urlConfigured: Boolean(supabaseUrl),
      serviceRoleConfigured: Boolean(serviceRoleKey),
    });

    throw new Error(
      "Missing Supabase server configuration"
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

// -------------------------------
// Edge Function
// -------------------------------

Deno.serve(
  async (request: Request): Promise<Response> => {
    const startedAt = Date.now();

    logInfo("MARKET_REFRESH_REQUEST_RECEIVED", {
      method: request.method,
    });

    // Only POST requests are allowed.
    if (request.method !== "POST") {
      return jsonResponse(
        {
          success: false,
          error: "Method not allowed",
        },
        405
      );
    }

    // Validate the refresh secret.
    const auth = verifyAuthorization(request);

    if (!auth.valid) {
      return jsonResponse(
        {
          success: false,
          error: "Unauthorized",
        },
        401
      );
    }

    try {
      const usdAed = Number(
        Deno.env.get("USD_AED_RATE") ??
          DEFAULT_USD_AED
      );

      if (
        !Number.isFinite(usdAed) ||
        usdAed <= 0
      ) {
        throw new Error(
          "Invalid USD/AED conversion rate"
        );
      }

      const supabase = getSupabaseClient();

      // Fetch all available metals in one request.
      const quotes = await fetchPrices();

      const rows: MarketRow[] = [];
      const failed: string[] = [];

      const metals = [
        {
          metal: "gold" as const,
          symbol: "XAU" as const,
        },
        {
          metal: "silver" as const,
          symbol: "XAG" as const,
        },
      ];

      for (const item of metals) {
        try {
          const quote = getMetalQuote(
            quotes,
            item.symbol
          );

          const row = buildRow(
            item.metal,
            quote,
            usdAed
          );

          rows.push(row);

          logInfo("METAL_PRICE_VALIDATED", {
            metal: item.metal,
            spotUsdOz: row.spot_usd_oz,
            priceGramAed: row.price_gram_aed,
            quoteTimestamp: row.updated_at,
          });
        } catch (error) {
          failed.push(item.metal);

          logError("METAL_PRICE_VALIDATION_FAILED", {
            metal: item.metal,
            message:
              error instanceof Error
                ? error.message
                : "Unknown validation error",
          });
        }
      }

      // Do not overwrite the database with invalid prices.
      if (rows.length === 0) {
        logError("NO_VALID_MARKET_PRICES", {
          failed,
        });

        return jsonResponse(
          {
            success: false,
            error: "No valid prices received",
            failed,
          },
          502
        );
      }

      // Avoid overwriting newer stored quotes
      // with older provider timestamps.
      const { data: existingRows, error: readError } =
        await supabase
          .from("market_quotes")
          .select("metal, updated_at")
          .in(
            "metal",
            rows.map((row) => row.metal)
          );

      if (readError) {
        throw new Error(
          `Database read failed: ${readError.message}`
        );
      }

      const existingByMetal = new Map<
        string,
        string | null
      >(
        (existingRows || []).map((row) => [
          row.metal,
          row.updated_at,
        ])
      );

      const rowsToSave = rows.filter((row) => {
        const previous = existingByMetal.get(row.metal);

        if (
          previous &&
          Date.parse(previous) >
            Date.parse(row.updated_at)
        ) {
          logInfo("OLDER_QUOTE_SKIPPED", {
            metal: row.metal,
            providerTimestamp: row.updated_at,
          });

          return false;
        }

        return true;
      });

      if (rowsToSave.length > 0) {
        const { error: dbError } = await supabase
          .from("market_quotes")
          .upsert(rowsToSave, {
            onConflict: "metal",
          });

        if (dbError) {
          logError("DATABASE_UPDATE_FAILED", {
            message: dbError.message,
          });

          throw new Error(
            `Database update failed: ${dbError.message}`
          );
        }
      }

      const durationMs = Date.now() - startedAt;

      logInfo("MARKET_REFRESH_COMPLETED", {
        updated: rowsToSave.map(
          (row) => row.metal
        ),
        failed,
        durationMs,
      });

      return jsonResponse({
        success: true,
        source: "goldprice.dev",
        updated: rowsToSave.map(
          (row) => row.metal
        ),
        failed,
        durationMs,
        prices: rows.map((row) => ({
          metal: row.metal,
          spotUsdOz: row.spot_usd_oz,
          gramAed: row.price_gram_aed,
          quoteTimestamp: row.updated_at,
        })),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error";

      logError("MARKET_REFRESH_FAILED", {
        message,
        durationMs: Date.now() - startedAt,
      });

      return jsonResponse(
        {
          success: false,
          error: "Market refresh failed",
          // Detailed information is in server logs.
        },
        500
      );
    }
  }
);
