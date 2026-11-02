function HeaderClock({ time }) {
  return (
    <header className="flex h-[120px] items-start justify-between">
      <div className="text-yellow-500">
        <div className="text-4xl font-black leading-none">SG</div>
        <div className="mt-2 text-2xl font-black">SWISS GOLD</div>
        <div className="text-xs font-extrabold tracking-wide">
          PRECIOUS METAL REFINING
        </div>
      </div>

      <div className="text-right">
        <div className="text-5xl font-black tracking-wide">
          {time.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>

        <div className="mt-2 text-xl">
          {time.toLocaleDateString("en-US", { weekday: "long" })}
        </div>

        <div className="mt-1 text-lg font-black">
          {time.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      </div>
    </header>
  );
}

export default HeaderClock;