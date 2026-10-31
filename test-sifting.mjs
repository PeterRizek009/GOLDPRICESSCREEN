
import WebSocket from "ws";

const API_KEY = process.env.SIFTING_API_KEY;
const TEST_DURATION = 60_000;

if (!API_KEY) {
  console.error("Missing SIFTING_API_KEY");
  process.exit(1);
}

const ws = new WebSocket(
  `wss://stream.sifting.io/ws/v1?key=${encodeURIComponent(API_KEY)}`
);

const stats = {
  XAUUSD: { ticks: 0, changes: 0, last: null },
  XAGUSD: { ticks: 0, changes: 0, last: null },
};

let pingTimer;
let stopTimer;

ws.on("open", () => {
  console.log("Connected to SiftingIO");

  ws.send(JSON.stringify({
    op: "subscribe",
    product: "com",
    symbols: ["XAUUSD", "XAGUSD"],
  }));

  pingTimer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ op: "ping" }));
    }
  }, 30000);

  stopTimer = setTimeout(() => {
    console.log("\n--- TEST RESULTS ---");

    for (const [symbol, result] of Object.entries(stats)) {
      console.log(`${symbol}:`);
      console.log(`  Total ticks: ${result.ticks}`);
      console.log(`  Price changes: ${result.changes}`);
      console.log(`  Last price: ${result.last ?? "N/A"}`);
    }

    ws.close();
  }, TEST_DURATION);
});

ws.on("message", (raw) => {
  let data;

  try {
    data = JSON.parse(raw.toString());
  } catch {
    return;
  }

  if (data.f === "error") {
    console.error("SiftingIO error:", data.code, data.message);
    return;
  }

  if (data.f === "ack") {
    console.log("ACK:", data.op, data.symbols ?? "");
    return;
  }

  if (data.f !== "tick") return;

  const symbol = data.s;
  const price = Number(data.p);

  if (!stats[symbol] || !Number.isFinite(price) || price <= 0) {
    return;
  }

  const stat = stats[symbol];
  stat.ticks++;

  if (stat.last !== null && stat.last !== price) {
    stat.changes++;
  }

  stat.last = price;

  const time = new Date(data.t).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Dubai",
    hour12: false,
  });

  console.log(
    `${time} | ${symbol} | ${price.toFixed(2)} USD`
  );
});

ws.on("error", (error) => {
  console.error("WebSocket error:", error.message);
});

ws.on("close", (code, reason) => {
  clearInterval(pingTimer);
  clearTimeout(stopTimer);

  console.log(
    `Connection closed: ${code} ${reason.toString()}`
  );
});
