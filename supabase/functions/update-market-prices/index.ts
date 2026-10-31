
import { createClient } from "npm:@supabase/supabase-js@2";

const API_URL = "https://api.goldprice.dev/v1/prices";
const GRAMS_PER_OUNCE = 31.1034768;

type Metal = "gold" | "silver";

type ApiQuote = {
  symbol: string;
  quote_currency: string;
  unit: string;
  contract_type: string;
  price: string | number;
  is_stale: boolean;
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

async function fetchPrices(): Promise<ApiQuote[]> {
  const apiKey = Deno.env.get("GOLDPRICE_API_KEY");

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(API_URL, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(
      `goldprice.dev returned HTTP ${response.status}`
    );
  }

  const data = await response.json();

  if (!Array.isArray(data.symbols)) {
    throw new Error("Invalid API response: missing symbols");
  }

  return data.symbols as ApiQuote[];
}

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
    throw new Error(`Missing ${symbol}/USD spot price`);
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

  if (quote.is_stale) {
    throw new Error(`${symbol} market data is stale`);
  }

  return quote;
}

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

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405 }
    );
  }

  const secret = Deno.env.get(
    "MARKET_REFRESH_SECRET"
  );

  const authorization = request.headers.get(
    "Authorization"
  );

  if (
    !secret ||
    authorization !== `Bearer ${secret}`
  ) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY"
    );

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Missing Supabase server configuration"
      );
    }

    const usdAed = Number(
      Deno.env.get("USD_AED_RATE") ?? "3.6725"
    );

    if (!Number.isFinite(usdAed) || usdAed <= 0) {
      throw new Error("Invalid USD/AED rate");
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // One API request for all available metals
    const quotes = await fetchPrices();

    const rows: MarketRow[] = [];
    const failed: string[] = [];

    for (const item of [
      { metal: "gold" as const, symbol: "XAU" as const },
      { metal: "silver" as const, symbol: "XAG" as const },
    ]) {
      try {
        const quote = getMetalQuote(
          quotes,
          item.symbol
        );

        rows.push(
          buildRow(
            item.metal,
            quote,
            usdAed
          )
        );
      } catch (error) {
        failed.push(item.metal);
        console.error(
          `${item.metal} processing failed:`,
          error
        );
      }
    }

    if (rows.length === 0) {
      return Response.json(
        {
          success: false,
          error: "No valid prices received",
          failed,
        },
        { status: 502 }
      );
    }

    const { error: dbError } = await supabase
      .from("market_quotes")
      .upsert(rows, {
        onConflict: "metal",
      });

    if (dbError) {
      throw dbError;
    }

    return Response.json({
      success: true,
      source: "goldprice.dev",
      updated: rows.map((row) => row.metal),
      failed,
      prices: rows.map((row) => ({
        metal: row.metal,
        spotUsdOz: row.spot_usd_oz,
        gramAed: row.price_gram_aed,
        updatedAt: row.updated_at,
      })),
    });
  } catch (error) {
    console.error("Market update error:", error);

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
});
