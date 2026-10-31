const SWISSQUOTE_XAU_URL =
  "/swissquote/public-quotes/bboquotes/instrument/XAU/USD";

export async function getSwissquoteGoldPrice() {
  const response = await fetch(SWISSQUOTE_XAU_URL);

  if (!response.ok) {
    throw new Error(`Swissquote API error: ${response.status}`);
  }

  const data = await response.json();



  const firstItem = data?.[0];

  if (!firstItem) {
    throw new Error("Swissquote returned empty data");
  }

  const priceItem =
    firstItem.spreadProfilePrices?.find(
      (item) => item.spreadProfile === "standard"
    ) || firstItem.spreadProfilePrices?.[0];

  if (!priceItem) {
    throw new Error("No spreadProfilePrices found from Swissquote");
  }

  const bid = Number(priceItem.bid);
  const ask = Number(priceItem.ask);

  if (!Number.isFinite(bid) || !Number.isFinite(ask)) {
    throw new Error("Invalid bid/ask from Swissquote");
  }

  const spot = (bid + ask) / 2;

  return {
    metal: "GOLD",
    symbol: "XAU/USD",
    spotPrice: Number(spot.toFixed(3)),
    bidPrice: Number(bid.toFixed(3)),
    askPrice: Number(ask.toFixed(3)),
    timestamp: firstItem.ts,
    source: "Swissquote",
  };
}