const GOLD_API_URL = "https://api.goldprice.dev/v1/prices?symbol=XAU-USD-SPOT";

export async function getGlobalGoldPrice() {
  const apiKey = import.meta.env.VITE_GOLD_API_KEY;

  if (!apiKey) {
    throw new Error("Missing VITE_GOLD_API_KEY in .env.local");
  }

  const response = await fetch(GOLD_API_URL, {
    method: "GET",
    headers: {
      "x-access-token": apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Gold API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    metal: "GOLD",
    currency: "USD",
    spotPrice: data.price,
    bidPrice: data.bid,
    askPrice: data.ask,
    timestamp: data.timestamp,
    raw: data,
  };
}