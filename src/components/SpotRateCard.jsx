function SpotRateCard({ goldSpot, silverSpot }) {
  return (
    <section className="h-[300px] overflow-hidden rounded-2xl border border-yellow-500 bg-black p-3">
      <h1 className="mb-2 rounded-xl bg-gradient-to-r from-[#8b5e13] via-[#f2d675] to-[#8b5e13] py-2 text-center text-[20px] font-black leading-none text-black">
        SPOT RATE
      </h1>

      <SpotRow
        label="GOLD"
        value={goldSpot?.spot_price}
        bid={goldSpot?.bid_price}
        ask={goldSpot?.ask_price}
        borderColor="border-red-600"
      />

      <div className="h-px bg-yellow-500" />

      <SpotRow
        label="SILVER"
        value={silverSpot?.spot_price}
        bid={silverSpot?.bid_price}
        ask={silverSpot?.ask_price}
        borderColor="border-green-600"
      />
    </section>
  );
}

function SpotRow({ label, value, bid, ask, borderColor }) {
  return (
    <div className="grid min-h-[96px] grid-cols-[1fr_1.2fr_0.9fr] items-center">
      <div className="text-[25px] font-black">{label}</div>

      <div className="text-center">
        <div className="text-[18px] font-black">
          BID{" "}
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-yellow-600 text-white">
            $
          </span>
        </div>

        <div
          className={`mt-1 inline-block min-w-[150px] rounded-lg border-[3px] border-dotted ${borderColor} px-3 py-1 text-[28px] font-black`}
        >
          {formatDecimal(value)}
        </div>
      </div>

      <div className="flex flex-col items-end gap-3">
        <div className="min-w-[115px] rounded-md bg-white px-3 py-1 text-center text-[18px] font-black text-black">
          {formatDecimal(bid)}
        </div>

        <div className="min-w-[115px] rounded-md bg-white px-3 py-1 text-center text-[18px] font-black text-black">
          {formatDecimal(ask)}
        </div>
      </div>
    </div>
  );
}

function formatDecimal(value) {
  if (value === null || value === undefined) return "----";

  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default SpotRateCard;