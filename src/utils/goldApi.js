
import { supabase } from "../lib/supabase.js";

export async function fetchMarketPrices() {
  const { data, error } = await supabase
    .from("market_quotes")
    .select("*")
    .in("metal", ["gold", "silver"]);

  if (error) throw error;

  const result = {
    gold: null,
    silver: null,
  };

  for (const item of data || []) {
    const quote = {
      metal: item.metal,
      currency: "USD",

      priceUsdOz: Number(item.spot_usd_oz),
      bidUsdOz: Number(item.bid_usd_oz),
      askUsdOz: Number(item.ask_usd_oz),
      lowUsdOz: Number(item.low_usd_oz),
      highUsdOz: Number(item.high_usd_oz),

      priceGram24kAed: Number(item.price_gram_aed),

      updatedAt: item.updated_at,
      source: item.source,
    };

    result[item.metal] = quote;
  }

  return result;
}


// const USD_AED_RATE = Number(import.meta.env.VITE_USD_AED_RATE || 3.6725);

// const MOCK_MARKET_PRICES = {
//   gold: {
//     metal: "XAU",
//     currency: "USD",
//     exchange: "MOCK",
//     symbol: "MOCK:XAUUSD",

//     priceUsdOz: 4185.14,
//     bidUsdOz: 4184.9,
//     askUsdOz: 4185.4,
//     lowUsdOz: 4130.96,
//     highUsdOz: 4207.59,

//     priceGram24kUsd: 4185.14 / 31.1035,
//     priceGram24kAed: (4185.14 / 31.1035) * USD_AED_RATE,

//     change: 49.99,
//     changePercent: 1.21,

//     timestamp: Math.floor(Date.now() / 1000),
//     datetime: new Date().toISOString(),
//   },

//   silver: {
//     metal: "XAG",
//     currency: "USD",
//     exchange: "MOCK",
//     symbol: "MOCK:XAGUSD",

//     priceUsdOz: 60.361,
//     bidUsdOz: 60.34,
//     askUsdOz: 60.38,
//     lowUsdOz: 59.186,
//     highUsdOz: 60.615,

//     priceGram24kUsd: 60.361 / 31.1035,
//     priceGram24kAed: (60.361 / 31.1035) * USD_AED_RATE,

//     change: 0.8,
//     changePercent: 1.34,

//     timestamp: Math.floor(Date.now() / 1000),
//     datetime: new Date().toISOString(),
//   },
// };

// export async function fetchMarketPrices() {
//   await new Promise((resolve) => setTimeout(resolve, 200));

//   const now = Math.floor(Date.now() / 1000);
//   const datetime = new Date().toISOString();

//   return {
//     gold: {
//       ...MOCK_MARKET_PRICES.gold,
//       timestamp: now,
//       datetime,
//     },

//     silver: {
//       ...MOCK_MARKET_PRICES.silver,
//       timestamp: now,
//       datetime,
//     },
//   };
// }