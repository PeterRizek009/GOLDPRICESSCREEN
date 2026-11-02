import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../lib/supabase.js";
import { fetchMarketPrices } from "../utils/marketPrices.js";

const KARATS = [24, 22, 21, 18];
const GRAMS_PER_OZ = 31.1034768;
const REFRESH_INTERVAL = 5000;

function CompanyScreenPage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);

  const [marketPrices, setMarketPrices] = useState({
    gold: null,
    silver: null,
  });

  const [trend, setTrend] = useState({
    gold: null,
    silver: null,
  });

  const [lastUpdated, setLastUpdated] = useState(null);
  const [now, setNow] = useState(new Date());

  const [loading, setLoading] = useState(true);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState("");
  const [screenError, setScreenError] = useState("");

  const prevOz = useRef({
    gold: null,
    silver: null,
  });

  const priceRequestRunning = useRef(false);

  useEffect(() => {
    let active = true;

    async function initializeScreen() {
      setLoading(true);
      setScreenError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          navigate("/login", { replace: true });
          return;
        }

        const { data: profileData, error: profileError } =
          await supabase
            .from("profiles")
            .select(
              "id, shop_name, contact_name, email, username, role, is_active"
            )
            .eq("id", user.id)
            .single();

        if (profileError || !profileData) {
          throw new Error(
            profileError?.message ||
              "Company profile could not be loaded."
          );
        }

        if (!profileData.is_active) {
          await supabase.auth.signOut();
          navigate("/login", { replace: true });
          return;
        }

        const { data: productsData, error: productsError } =
          await supabase
            .from("company_products")
            .select("*")
            .eq("company_id", user.id)
            .eq("is_active", true)
            .order("created_at", { ascending: true });

        if (productsError) {
          throw productsError;
        }

        if (!active) return;

        setProfile(profileData);
        setProducts(productsData || []);

        await loadMarketPrices();
      } catch (error) {
        console.error("Company screen error:", error);

        if (active) {
          setScreenError(
            error.message || "Screen could not be loaded."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    initializeScreen();

    const priceTimer = setInterval(() => {
      loadMarketPrices();
    }, REFRESH_INTERVAL);

    const clockTimer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      active = false;
      clearInterval(priceTimer);
      clearInterval(clockTimer);
    };
  }, [navigate]);

  async function loadMarketPrices() {
    if (priceRequestRunning.current) return;

    priceRequestRunning.current = true;
    setPriceLoading(true);
    setPriceError("");

    try {
      const prices = await fetchMarketPrices();

      const gold = prices?.gold || null;
      const silver = prices?.silver || null;

      if (!gold && !silver) {
        throw new Error(
          "No market prices found in Supabase."
        );
      }

      const nextPrices = { gold, silver };

      setMarketPrices((previous) => ({
        gold: gold || previous.gold,
        silver: silver || previous.silver,
      }));

      const newTrend = {};

      for (const metal of ["gold", "silver"]) {
        const currentPrice = readOz(nextPrices[metal]);
        const previousPrice = prevOz.current[metal];

        if (
          currentPrice > 0 &&
          previousPrice > 0 &&
          currentPrice !== previousPrice
        ) {
          const difference = currentPrice - previousPrice;

          newTrend[metal] = {
            dir: difference > 0 ? "up" : "down",
            pct: Math.abs(
              (difference / previousPrice) * 100
            ),
          };
        }

        if (currentPrice > 0) {
          prevOz.current[metal] = currentPrice;
        }
      }

      if (Object.keys(newTrend).length > 0) {
        setTrend((previous) => ({
          ...previous,
          ...newTrend,
        }));
      }

      const timestamps = [gold, silver]
        .map((item) => item?.updatedAt)
        .filter(Boolean)
        .map((value) => new Date(value))
        .filter((date) => !Number.isNaN(date.getTime()));

      if (timestamps.length > 0) {
        const oldestTimestamp = Math.min(
          ...timestamps.map((date) => date.getTime())
        );

        setLastUpdated(new Date(oldestTimestamp));
      } else {
        setLastUpdated(null);
      }
    } catch (error) {
      console.error("Market prices error:", error);

      setPriceError(
        error.message ||
          "Could not load stored market prices."
      );
    } finally {
      priceRequestRunning.current = false;
      setPriceLoading(false);
    }
  }

  const goldGramRate = Number(
    marketPrices.gold?.priceGram24kAed || 0
  );

  const silverGramRate = Number(
    marketPrices.silver?.priceGram24kAed || 0
  );

  const calculatedProducts = useMemo(() => {
    return products.map((product) => {
      const metal = detectProductMetal(product);

      const gramRate =
        metal === "silver"
          ? silverGramRate
          : goldGramRate;

      return {
        ...product,
        calculated_price: calculateProductPrice(
          product,
          gramRate
        ),
        hasRate: gramRate > 0,
      };
    });
  }, [products, goldGramRate, silverGramRate]);

  const shopName =
    profile?.shop_name ||
    profile?.contact_name ||
    profile?.username ||
    "Gold Shop";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0B0B0B] text-[#E8B923]">
        <div className="text-center">
          <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-4 border-[#E8B923]/20 border-t-[#E8B923]" />

          <p className="text-base font-medium">
            Loading screen...
          </p>
        </div>
      </main>
    );
  }

  if (screenError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0B0B0B] px-6 text-white">
        <div className="max-w-lg text-center">
          <h1 className="text-2xl font-bold text-red-400">
            Screen could not be loaded
          </h1>

          <p className="mt-3 text-zinc-400">
            {screenError}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-lg border border-[#E8B923] px-5 py-2 text-[#E8B923]"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#0B0B0B] text-[#F5F0E1]">
      <TopBar
        shopName={shopName}
        gold={marketPrices.gold}
        silver={marketPrices.silver}
        trend={trend}
        now={now}
        onBack={() => navigate("/company/dashboard")}
      />

      <ProductGrid products={calculatedProducts} />

      <BottomBar
        goldGramRate={goldGramRate}
        lastUpdated={lastUpdated}
        error={priceError}
        priceLoading={priceLoading}
        now={now}
        goldSource={marketPrices.gold?.source}
      />
    </main>
  );
}

/* ---------- Top Bar ---------- */

function TopBar({
  shopName,
  gold,
  silver,
  trend,
  now,
  onBack,
}) {
  const initials = shopName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <header className="flex items-center justify-between gap-6 border-b border-[#2a2618] px-[2vw] py-[1.2vh]">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-[#E8B923] text-xl font-bold text-[#E8B923]">
          {initials}
        </div>

        <div className="min-w-0">
          <h1 className="truncate text-[clamp(1.2rem,1.8vw,2.6rem)] font-bold leading-tight text-[#E8B923]">
            {shopName}
          </h1>

          <p className="text-[clamp(0.75rem,0.9vw,1.2rem)] text-[#B8AE92]">
            Gold & Silver Prices
          </p>
        </div>
      </div>

      <div className="flex items-center gap-[2.5vw]">
        <SpotPrice
          label="Gold oz · USD"
          value={readOz(gold)}
          trend={trend.gold}
          valueClass="text-[#E8B923]"
          decimals={2}
        />

        <div className="h-12 w-px bg-[#2a2618]" />

        <SpotPrice
          label="Silver oz · USD"
          value={readOz(silver)}
          trend={trend.silver}
          valueClass="text-[#E8E8E8]"
          decimals={2}
        />
      </div>

      <div className="flex items-center gap-5">
        <div className="text-right">
          <p className="text-[clamp(1.4rem,2.2vw,3.2rem)] font-bold leading-none tabular-nums">
            {now.toLocaleTimeString("en-GB", {
              timeZone: "Asia/Dubai",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          <p className="mt-1 text-[clamp(0.75rem,0.9vw,1.2rem)] text-[#B8AE92]">
            {now.toLocaleDateString("en-GB", {
              timeZone: "Asia/Dubai",
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/40 transition hover:border-white/30 hover:text-white"
        >
          Back
        </button>
      </div>
    </header>
  );
}

function SpotPrice({
  label,
  value,
  trend,
  valueClass,
  decimals,
}) {
  const isUp = trend?.dir === "up";

  return (
    <div className="text-center">
      <p className="text-[clamp(0.75rem,0.9vw,1.2rem)] text-[#B8AE92]">
        {label}
      </p>

      <p
        className={`flex items-baseline justify-center gap-2 text-[clamp(1.3rem,2.2vw,3.2rem)] font-bold leading-tight tabular-nums ${valueClass}`}
      >
        {value > 0
          ? formatNumber(value, decimals)
          : "---"}

        {trend && value > 0 && (
          <span
            className={`text-[clamp(0.75rem,1vw,1.4rem)] font-semibold ${
              isUp ? "text-green-400" : "text-red-400"
            }`}
          >
            {isUp ? "▲" : "▼"}{" "}
            {trend.pct.toFixed(2)}%
          </span>
        )}
      </p>
    </div>
  );
}

/* ---------- Product Grid ---------- */

function ProductGrid({ products }) {
  if (products.length === 0) {
    return (
      <div className="m-[2vw] flex flex-1 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03]">
        <p className="text-2xl font-semibold text-zinc-500">
          No active products found.
        </p>
      </div>
    );
  }

  const count = products.length;

  const columns =
    count <= 4
      ? count
      : count <= 6
      ? 3
      : count <= 8
      ? 4
      : 5;

  return (
    <div
      className="grid min-h-0 flex-1 auto-rows-fr gap-[1vw] overflow-hidden px-[2vw] py-[1.5vh]"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
        />
      ))}
    </div>
  );
}

function ProductCard({ product }) {
  const featured = Boolean(product.is_featured);

  return (
    <div
      className={`flex min-h-0 flex-col items-center justify-between rounded-2xl border bg-[#16140E] p-[1.2vw] ${
        featured
          ? "border-[#E8B923]"
          : "border-[#3a3320]"
      }`}
    >
      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.product_name}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="flex aspect-[3/4] h-[70%] max-h-40 items-center justify-center overflow-hidden rounded-md border-2 border-[#C99A12] bg-[#E8B923] px-1 text-center text-[clamp(0.9rem,1.3vw,1.8rem)] font-bold leading-tight text-[#5a4309]">
            {product.weight} {product.unit}
          </div>
        )}
      </div>

      <div className="mt-3 w-full text-center">
        <h2 className="line-clamp-2 text-[clamp(1rem,1.5vw,2.2rem)] font-semibold leading-tight">
          {product.product_name}
        </h2>

        <p className="mt-1 text-[clamp(0.8rem,1vw,1.4rem)] text-[#B8AE92]">
          {product.weight} {product.unit}
          {detectProductMetal(product) === "gold"
            ? " · 24K"
            : " · Silver"}
        </p>

        <p className="mt-2 flex items-baseline justify-center gap-2 font-bold leading-none text-[#E8B923]">
          <span className="text-[clamp(1.6rem,2.6vw,4rem)] tabular-nums tracking-tight">
            {product.hasRate
              ? formatNumber(
                  product.calculated_price,
                  0
                )
              : "---"}
          </span>

          <span className="text-[clamp(0.8rem,1vw,1.4rem)]">
            AED
          </span>
        </p>
      </div>
    </div>
  );
}

/* ---------- Bottom Bar ---------- */

function BottomBar({
  goldGramRate,
  lastUpdated,
  error,
  priceLoading,
  now,
  goldSource,
}) {
  const ageMinutes = lastUpdated
    ? (now.getTime() - lastUpdated.getTime()) / 60000
    : null;

  const isDemo = goldSource === "demo";
  const isStale =
    ageMinutes !== null && ageMinutes > 10;

  let statusText = "Waiting for prices";

  if (error) {
    statusText = "Price update failed";
  } else if (isDemo) {
    statusText = "DEMO PRICES";
  } else if (lastUpdated) {
    statusText = `Updated ${lastUpdated.toLocaleTimeString(
      "en-GB",
      {
        timeZone: "Asia/Dubai",
      }
    )}`;

    if (isStale) {
      statusText += " · Delayed";
    }
  } else if (priceLoading) {
    statusText = "Loading prices...";
  }

  return (
    <footer className="flex items-center justify-between gap-6 border-t border-[#2a2618] bg-[#16140E] px-[2vw] py-[2.2vh] text-[clamp(1.2rem,2.2vw,3.2rem)]">
      <span className="text-[clamp(0.9rem,1.2vw,1.7rem)] text-[#B8AE92]">
        Gram price
      </span>

      {KARATS.map((karat) => (
        <span key={karat} className="font-semibold">
          {karat}K{" "}
          <b className="font-bold text-[#E8B923] tabular-nums">
            {goldGramRate > 0
              ? formatNumber(
                  (goldGramRate * karat) / 24,
                  1
                )
              : "---"}
          </b>
        </span>
      ))}

      <span
        className={`text-[clamp(0.85rem,1.1vw,1.5rem)] ${
          error || isStale
            ? "text-red-400"
            : isDemo
            ? "text-yellow-400"
            : "text-[#B8AE92]"
        }`}
      >
        {statusText}
      </span>
    </footer>
  );
}

/* ---------- Helpers ---------- */

function readOz(metal) {
  if (!metal) return 0;

  const price = Number(
    metal.priceOz ??
      metal.priceUsdOz ??
      metal.priceUsd ??
      metal.price ??
      0
  );

  return Number.isFinite(price) ? price : 0;
}

function formatNumber(value, decimals = 0) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Currently uses the product name to identify silver.
// Later, add a dedicated "metal_type" column.
function detectProductMetal(product) {
  if (
    product.metal_type === "silver" ||
    product.metal === "silver"
  ) {
    return "silver";
  }

  if (
    product.metal_type === "gold" ||
    product.metal === "gold"
  ) {
    return "gold";
  }

  const name = String(
    product.product_name || ""
  ).toLowerCase();

  if (
    name.includes("silver") ||
    name.includes("فضة")
  ) {
    return "silver";
  }

  return "gold";
}

function calculateProductPrice(
  product,
  gramRate
) {
  if (
    !Number.isFinite(gramRate) ||
    gramRate <= 0
  ) {
    return 0;
  }

  let weightInGram = Number(
    product.weight || 0
  );

  const unit = String(
    product.unit || "GM"
  ).toUpperCase();

  if (unit === "OZ") {
    weightInGram *= GRAMS_PER_OZ;
  } else if (unit === "KG") {
    weightInGram *= 1000;
  }

  const basePrice =
    gramRate * weightInGram;

  const adjustmentValue = Number(
    product.adjustment_value || 0
  );

  let adjustment = adjustmentValue;

  if (
    product.adjustment_mode === "per_gram"
  ) {
    adjustment =
      adjustmentValue * weightInGram;
  }

  if (
    product.adjustment_type === "discount"
  ) {
    return Math.max(
      basePrice - adjustment,
      0
    );
  }

  return Math.max(
    basePrice + adjustment,
    0
  );
}

export default CompanyScreenPage;