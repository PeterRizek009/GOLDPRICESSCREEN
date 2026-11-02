function MarketSpotRate({ marketPrices, loading }) {
  return (
    <section className="mb-4 w-[620px] max-w-full rounded-xl border border-[#2d333b] bg-[#15191f] p-3 shadow-lg shadow-black/30">
      <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#c8a44d]">
            Market Summary
          </p>

          <h2 className="mt-0.5 text-xl font-bold tracking-[-0.02em] text-white">
            Spot Market Overview
          </h2>
        </div>

        <div className="rounded-full border border-[#3b424c] bg-[#1d232b] px-2.5 py-1 text-[10px] font-medium text-[#c8ccd2]">
          USD / OZ
        </div>
      </div>

      <div className="space-y-2">
        <MetalRow
          metal="Gold"
          code="XAU"
          symbol="Au"
          spot={marketPrices?.gold?.priceUsdOz}
          low={marketPrices?.gold?.lowUsdOz}
          high={marketPrices?.gold?.highUsdOz}
          decimals={2}
          loading={loading}
          accent="gold"
        />

        <MetalRow
          metal="Silver"
          code="XAG"
          symbol="Ag"
          spot={marketPrices?.silver?.priceUsdOz}
          low={marketPrices?.silver?.lowUsdOz}
          high={marketPrices?.silver?.highUsdOz}
          decimals={3}
          loading={loading}
          accent="silver"
        />
      </div>

      <div className="mt-3 border-t border-white/10 pt-2 text-[10px] text-[#98a1ab]">
        Demo market prices · API disabled temporarily
      </div>
    </section>
  );
}

function MetalRow({
  metal,
  code,
  symbol,
  spot,
  low,
  high,
  decimals,
  loading,
  accent,
}) {
  return (
    <div className="rounded-lg border border-white/8 bg-[#1b2027] px-3 py-3">
      <div className="grid grid-cols-[145px_1fr_175px] items-center gap-3">
        <div className="flex items-center gap-2.5">
          <CoinBadge symbol={symbol} accent={accent} />

          <div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-white">{metal}</p>

              <span className="rounded-md border border-white/10 bg-black/25 px-1.5 py-0.5 text-[10px] font-bold text-[#c8ccd2]">
                {code}
              </span>
            </div>

            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-[#9aa3ad]">
              Spot Price
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-end gap-1.5">
            <span className="text-3xl font-bold leading-none tracking-[-0.03em] text-white">
              {loading ? "..." : formatValue(spot, decimals)}
            </span>

            <span className="pb-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9aa3ad]">
              USD/OZ
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MetricBox label="Low" value={low} decimals={decimals} tone="low" />
          <MetricBox label="High" value={high} decimals={decimals} tone="high" />
        </div>
      </div>
    </div>
  );
}

function CoinBadge({ symbol, accent }) {
  const classes =
    accent === "gold"
      ? "border-[#f2ca67] bg-gradient-to-br from-[#fff2a8] via-[#d9a72e] to-[#7c5412] text-[#2a1b04]"
      : "border-[#eef2f6] bg-gradient-to-br from-white via-[#c8ced6] to-[#69717c] text-[#20252b]";

  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-black shadow-md ${classes}`}
    >
      {symbol}
    </div>
  );
}

function MetricBox({ label, value, decimals, tone }) {
  const toneClasses =
    tone === "high"
      ? "border-[#244436] bg-[#16241d]"
      : "border-[#4a2a2a] bg-[#26191b]";

  const labelClasses =
    tone === "high" ? "text-[#6ed39a]" : "text-[#ff8b8b]";

  return (
    <div className={`rounded-md border px-2 py-1.5 ${toneClasses}`}>
      <p
        className={`text-[9px] font-semibold uppercase tracking-[0.1em] ${labelClasses}`}
      >
        {label}
      </p>

      <p className="mt-0.5 text-base font-bold text-white">
        {formatValue(value, decimals)}
      </p>
    </div>
  );
}

function formatValue(value, decimals) {
  const num = Number(value || 0);

  if (!num) {
    return "---";
  }

  return num.toFixed(decimals);
}

export default MarketSpotRate;