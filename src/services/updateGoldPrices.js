import { supabase } from "../lib/supabase.js";
import { calculateGoldGramPrices } from "../utils/goldCalculations.js";
import { getSwissquoteGoldPrice } from "./swissquoteGoldApi.js";

export async function updateGoldPricesInSupabase() {
  const gold = await getSwissquoteGoldPrice();

  console.log("Parsed Swissquote gold:", gold);

  if (!Number.isFinite(gold.spotPrice)) {
    throw new Error("Invalid spot price");
  }

  if (!Number.isFinite(gold.bidPrice)) {
    throw new Error("Invalid bid price");
  }

  if (!Number.isFinite(gold.askPrice)) {
    throw new Error("Invalid ask price");
  }

  const gramPrices = calculateGoldGramPrices(gold.spotPrice);

  console.log("Gram prices:", gramPrices);

  const payload = {
    spot_price: gold.spotPrice,
    bid_price: gold.bidPrice,
    ask_price: gold.askPrice,

    price_per_gram_24k: gramPrices.price_per_gram_24k,
    price_per_gram_22k: gramPrices.price_per_gram_22k,
    price_per_gram_21k: gramPrices.price_per_gram_21k,
    price_per_gram_18k: gramPrices.price_per_gram_18k,

    updated_at: new Date().toISOString(),
  };

  console.log("Update payload:", payload);

  const { data, error } = await supabase
    .from("live_metal_prices")
    .update(payload)
    .eq("metal", "GOLD")
    .select();

  console.log("Supabase update result:", { data, error });

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    throw new Error("Update returned no rows. Check metal = GOLD.");
  }

  return data;
}