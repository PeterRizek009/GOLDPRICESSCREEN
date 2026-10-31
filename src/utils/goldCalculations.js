const TROY_OUNCE_GRAMS = 31.1034768;
const USD_TO_AED = 3.674;

export function calculateGoldGramPrices(xauUsdPrice) {
  const price24k = (xauUsdPrice * USD_TO_AED) / TROY_OUNCE_GRAMS;

  return {
    price_per_gram_24k: Number(price24k.toFixed(4)),
    price_per_gram_22k: Number((price24k * 0.9167).toFixed(4)),
    price_per_gram_21k: Number((price24k * 0.875).toFixed(4)),
    price_per_gram_18k: Number((price24k * 0.75).toFixed(4)),
    price_per_gram_995: Number((price24k * 0.995).toFixed(4)),
  };
}