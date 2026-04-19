"use client";

// 매매 상세/동향 차트 공용 컴포넌트.
// - Y축: 최저/중간/최고 가격 라벨
// - X축: 시작/중간/오늘 날짜 라벨
// - 터치/호버: 해당 지점 수직선 + 점 + 툴팁 (날짜 · 가격)
// 마커:
//   TRADE: 매매 체결 포인트 (매수=up / 매도=down), 현재 보고 있는 거래는 강조
//   EVENT: ±3% 이상 이벤트 (호재=up outline / 악재=down outline / 중립=회색)

import { useRef, useState } from "react";

type Point = { date: string; price: number };
type Marker = {
  date: string;
  price: number;
  kind?: "TRADE" | "EVENT";
  side?: "BUY" | "SELL";
  current?: boolean;
  dominantImpact?: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
};

function formatPrice(v: number, currency?: string): string {
  if (currency === "USD") {
    return (
      "$" +
      v.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }
  if (currency === "USDT") {
    return v.toLocaleString("en-US", { maximumFractionDigits: 2 }) + " USDT";
  }
  if (currency === "KRW") {
    return v.toLocaleString("ko-KR") + "원";
  }
  // currency 미지정: 숫자만
  return v.toLocaleString(undefined, {
    maximumFractionDigits: v < 10 ? 4 : v < 1000 ? 2 : 0,
  });
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${m}-${day}`;
}

function formatFullDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

export default function TradeChart({
  series,
  markers,
  currency,
}: {
  series: Point[];
  markers: Marker[];
  currency?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (series.length < 2) return null;

  const W = 400;
  const H = 200;
  const leftPad = 48;
  const rightPad = 4;
  const topPad = 8;
  const bottomPad = 24;
  const chartW = W - leftPad - rightPad;
  const chartH = H - topPad - bottomPad;

  const prices = series.map((p) => p.price).concat(markers.map((m) => m.price));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || max * 0.02 || 1;
  const ymin = min - range * 0.08;
  const ymax = max + range * 0.08;
  const ymid = (ymin + ymax) / 2;

  const xOf = (i: number) => leftPad + (i / (series.length - 1)) * chartW;
  const yOf = (v: number) =>
    topPad + (1 - (v - ymin) / (ymax - ymin)) * chartH;

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

  function pointerToIndex(clientX: number): number | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    // viewBox 좌표계로 환산 후 chart 영역 내 비율
    const svgX = ratio * W;
    if (svgX < leftPad - 8) return null;
    if (svgX > W - rightPad + 8) return null;
    const inChart = Math.max(0, Math.min(1, (svgX - leftPad) / chartW));
    return Math.round(inChart * (series.length - 1));
  }

  const midIdx = Math.floor((series.length - 1) / 2);

  const hover = hoverIdx !== null ? series[hoverIdx] : null;
  const hoverX = hoverIdx !== null ? xOf(hoverIdx) : 0;
  const hoverY = hover ? yOf(hover.price) : 0;
  const tooltipXPct = hoverIdx !== null ? (hoverX / W) * 100 : 0;
  const tooltipOnRight = hoverIdx !== null && hoverX < W / 2;

  return (
    <div className="relative w-full" style={{ aspectRatio: `${W}/${H}` }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        className="block overflow-visible touch-none select-none"
        onMouseMove={(e) => {
          const idx = pointerToIndex(e.clientX);
          setHoverIdx(idx);
        }}
        onMouseLeave={() => setHoverIdx(null)}
        onTouchStart={(e) => {
          if (e.touches[0]) {
            const idx = pointerToIndex(e.touches[0].clientX);
            setHoverIdx(idx);
          }
        }}
        onTouchMove={(e) => {
          if (e.touches[0]) {
            const idx = pointerToIndex(e.touches[0].clientX);
            setHoverIdx(idx);
          }
        }}
        onTouchEnd={() => setHoverIdx(null)}
      >
        {/* Y축 가이드라인 (최고/중간/최저) */}
        {[ymax, ymid, ymin].map((v, i) => (
          <line
            key={i}
            x1={leftPad}
            y1={yOf(v)}
            x2={W - rightPad}
            y2={yOf(v)}
            stroke="var(--border)"
            strokeWidth={0.5}
            strokeDasharray={i === 1 ? "" : "2 3"}
            opacity={0.7}
          />
        ))}

        {/* Y축 라벨 — 비율 왜곡 방지 위해 transform */}
        <g transform={`scale(1, 1)`}>
          {[ymax, ymid, ymin].map((v, i) => (
            <text
              key={i}
              x={leftPad - 4}
              y={yOf(v) + 3}
              fontSize={10}
              textAnchor="end"
              fill="var(--text-subtle)"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatPrice(v, currency)}
            </text>
          ))}
        </g>

        {/* X축 라벨 */}
        <text
          x={xOf(0)}
          y={H - 6}
          fontSize={10}
          textAnchor="start"
          fill="var(--text-subtle)"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatShortDate(series[0].date)}
        </text>
        <text
          x={xOf(midIdx)}
          y={H - 6}
          fontSize={10}
          textAnchor="middle"
          fill="var(--text-subtle)"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatShortDate(series[midIdx].date)}
        </text>
        <text
          x={xOf(series.length - 1)}
          y={H - 6}
          fontSize={10}
          textAnchor="end"
          fill="var(--text-subtle)"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatShortDate(series[series.length - 1].date)}
        </text>

        {/* 가격 라인 */}
        <path
          d={pathD}
          fill="none"
          style={{ stroke: "var(--text-muted)" }}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.7}
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
              <circle
                key={`${m.date}-${idx}`}
                cx={x}
                cy={y}
                r={5}
                fill="white"
                style={{ stroke: eventColor }}
                strokeWidth={2}
              />
            );
          }
          const color = m.side === "BUY" ? "var(--up)" : "var(--down)";
          const isCurrent = !!m.current;
          return (
            <g key={`${m.date}-${idx}`}>
              <line
                x1={x}
                y1={topPad}
                x2={x}
                y2={H - bottomPad}
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

        {/* 호버 가이드 라인 + 점 */}
        {hoverIdx !== null && hover && (
          <g>
            <line
              x1={hoverX}
              y1={topPad}
              x2={hoverX}
              y2={H - bottomPad}
              stroke="var(--accent)"
              strokeWidth={0.8}
              opacity={0.5}
            />
            <circle
              cx={hoverX}
              cy={hoverY}
              r={4}
              fill="var(--accent)"
              stroke="white"
              strokeWidth={1.5}
            />
          </g>
        )}
      </svg>

      {/* 툴팁 (HTML 오버레이) */}
      {hoverIdx !== null && hover && (
        <div
          className="absolute pointer-events-none z-10"
          style={{
            left: `${tooltipXPct}%`,
            top: 0,
            transform: tooltipOnRight ? "translate(8px, 0)" : "translate(-100%, 0) translateX(-8px)",
          }}
        >
          <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-lg shadow-md px-2.5 py-1.5 text-[11px] leading-tight whitespace-nowrap">
            <div className="text-[color:var(--text-subtle)] tabular">
              {formatFullDate(hover.date)}
            </div>
            <div className="font-bold tabular">
              {formatPrice(hover.price, currency)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
