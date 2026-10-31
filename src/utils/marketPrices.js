
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
