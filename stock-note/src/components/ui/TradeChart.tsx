// 매매 상세/동향 차트 공용 컴포넌트.
// TRADE 마커: 매매 체결 포인트 (매수=up / 매도=down). 현재 보고 있는 거래는 크게 강조.
// EVENT 마커: ±3% 이상 이벤트 날. 호재 dominant=빨간 outline / 악재=파란 outline / 중립=회색.

type Point = { date: string; price: number };
type Marker = {
  date: string;
  price: number;
  /** 기본 "TRADE" */
  kind?: "TRADE" | "EVENT";
  /** TRADE 전용 */
  side?: "BUY" | "SELL";
  /** TRADE 전용: 현재 상세 페이지에서 보고 있는 거래인지 */
  current?: boolean;
  /** EVENT 전용: 호재/악재 dominant 방향 */
  dominantImpact?: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
};

export default function TradeChart({
  series,
  markers,
}: {
  series: Point[];
  markers: Marker[];
}) {
  if (series.length < 2) return null;

  const W = 400;
  const H = 160;
  const padX = 4;
  const padY = 16;
  const chartW = W - padX * 2;
  const chartH = H - padY * 2;

  const prices = series
    .map((p) => p.price)
    .concat(markers.map((m) => m.price));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || max * 0.02 || 1;
  const ymin = min - range * 0.1;
  const ymax = max + range * 0.1;

  const xOf = (i: number) => padX + (i / (series.length - 1)) * chartW;
  const yOf = (v: number) =>
    padY + (1 - (v - ymin) / (ymax - ymin)) * chartH;

  const pathD = series
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(p.price).toFixed(1)}`
    )
    .join(" ");

  function findIndex(iso: string): number {
    const t = new Date(iso).getTime();
    let best = 0;
    let minDiff = Infinity;
    series.forEach((p, i) => {
      const d = Math.abs(new Date(p.date).getTime() - t);
      if (d < minDiff) {
        minDiff = d;
        best = i;
      }
    });
    return best;
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      className="block overflow-visible"
    >
      {/* 가격 라인 */}
      <path
        d={pathD}
        fill="none"
        style={{ stroke: "var(--text-muted)" }}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.55}
      />
      {/* 마커 */}
      {markers.map((m, idx) => {
        const x = xOf(findIndex(m.date));
        const y = yOf(m.price);
        const kind = m.kind ?? "TRADE";
        if (kind === "EVENT") {
          const eventColor =
            m.dominantImpact === "POSITIVE"
              ? "var(--up)"
              : m.dominantImpact === "NEGATIVE"
              ? "var(--down)"
              : "var(--text-muted)";
          return (
            <g key={`${m.date}-${idx}`}>
              <circle
                cx={x}
                cy={y}
                r={5}
                fill="white"
                style={{ stroke: eventColor }}
                strokeWidth={2}
              />
            </g>
          );
        }
        // TRADE
        const color = m.side === "BUY" ? "var(--up)" : "var(--down)";
        const isCurrent = !!m.current;
        return (
          <g key={`${m.date}-${idx}`}>
            <line
              x1={x}
              y1={padY}
              x2={x}
              y2={H - padY}
              style={{ stroke: color }}
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={isCurrent ? 0.45 : 0.22}
            />
            <circle
              cx={x}
              cy={y}
              r={isCurrent ? 6 : 4}
              style={{ fill: color }}
              stroke="white"
              strokeWidth={isCurrent ? 2.5 : 1.5}
              opacity={isCurrent ? 1 : 0.75}
            />
          </g>
        );
      })}
    </svg>
  );
}
