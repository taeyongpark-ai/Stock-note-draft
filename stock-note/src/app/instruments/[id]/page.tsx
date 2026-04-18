import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import Logo from "@/components/ui/Logo";
import { INSTRUMENTS, TRADES } from "@/lib/mock";
import {
  formatMoney,
  formatPct,
  deltaClass,
  deltaArrow,
  formatDateKo,
} from "@/lib/format";
import { ChevronLeft } from "lucide-react";

type Props = PageProps<"/instruments/[id]">;

export default async function InstrumentDetail({ params }: Props) {
  const { id } = await params;
  const it = INSTRUMENTS.find((i) => i.id === id);
  if (!it) notFound();

  const trades = TRADES.filter((t) => t.instrumentId === id).sort((a, b) =>
    a.executedAt.localeCompare(b.executedAt)
  );

  // 차트용 더미 가격 라인 (스파크라인 여러 포인트)
  const basePrices = trades.length
    ? trades.map((t) => t.price)
    : [it.currentPrice];
  const last = it.currentPrice;
  const first = basePrices[0];
  const points: number[] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    const base = first + (last - first) * ratio;
    const noise = (Math.sin(i * 0.9) + Math.cos(i * 0.3)) * (last * 0.01);
    points.push(base + noise);
  }

  const w = 420,
    h = 180;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => {
      const x = i * step;
      const y = h - ((p - min) / span) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  // 매매 포인트 위치
  const markers = trades.map((t, idx) => {
    const ratio =
      trades.length === 1 ? 0.5 : idx / (trades.length - 1);
    const x = ratio * w;
    const y = h - ((t.price - min) / span) * h;
    return { t, x, y };
  });

  return (
    <div className="space-y-4 pt-2 pb-4">
      <div className="flex items-center gap-2">
        <Link href="/portfolio" className="w-9 h-9 -ml-2 grid place-items-center">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-[18px] font-extrabold">{it.name}</h1>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-3">
          <Logo name={it.name} color={it.color} size={52} />
          <div>
            <div className="font-bold text-[18px]">{it.name}</div>
            <div className="text-xs text-[color:var(--text-muted)]">
              {it.market} · {it.symbol}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-end gap-3">
          <div className={`text-[32px] font-black tabular ${deltaClass(it.dayChange)}`}>
            {it.currentPrice.toLocaleString()}
          </div>
          <div className={`pb-1 text-[14px] font-semibold ${deltaClass(it.dayChange)}`}>
            {deltaArrow(it.dayChange)} {formatPct(it.dayChange)}
          </div>
        </div>
      </Card>

      {/* 차트 + 내 매매 포인트 */}
      <Card className="p-5">
        <div className="font-bold text-[15px] mb-3">가격 추이 + 내 매매</div>
        <svg viewBox={`0 0 ${w} ${h + 30}`} className="w-full">
          <path d={d} fill="none" stroke="var(--text-subtle)" strokeWidth={1.5} />
          {markers.map((m) => (
            <g key={m.t.id}>
              <circle
                cx={m.x}
                cy={m.y}
                r={7}
                fill={m.t.side === "BUY" ? "var(--up)" : "var(--down)"}
                stroke="white"
                strokeWidth={2}
              />
              <text
                x={m.x}
                y={h + 18}
                textAnchor="middle"
                fontSize="10"
                fill="var(--text-muted)"
              >
                {new Date(m.t.executedAt).getMonth() + 1}/
                {new Date(m.t.executedAt).getDate()}
              </text>
            </g>
          ))}
        </svg>
        <div className="mt-2 flex items-center gap-4 text-xs text-[color:var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--up)]" /> 매수
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--down)]" /> 매도
          </span>
        </div>
      </Card>

      {/* 이 종목 매매 타임라인 */}
      <Card className="py-1">
        <div className="px-5 pt-4 pb-2 font-bold text-[15px]">매매 타임라인</div>
        {trades.map((t, i) => (
          <Link
            key={t.id}
            href={`/trades/${t.id}`}
            className={`flex items-center gap-3 px-5 py-3.5 ${
              i !== trades.length - 1 ? "border-b border-[color:var(--border)]" : ""
            }`}
          >
            <div
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                t.side === "BUY"
                  ? "bg-[color:var(--up)]"
                  : "bg-[color:var(--down)]"
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">
                {t.side === "BUY" ? "매수" : "매도"} {t.quantity}
                {it.currency === "USDT" ? "" : "주"} @{" "}
                {t.price.toLocaleString()}
                {it.currency === "KRW" ? "원" : ""}
              </div>
              <div className="text-xs text-[color:var(--text-muted)]">
                {formatDateKo(new Date(t.executedAt))}
              </div>
            </div>
            <div className="text-right text-[13px] font-bold tabular">
              {formatMoney(t.price * t.quantity, it.currency)}
            </div>
          </Link>
        ))}
        {trades.length === 0 && (
          <div className="py-10 text-center text-sm text-[color:var(--text-muted)]">
            이 종목 매매 기록이 없습니다.
          </div>
        )}
      </Card>
    </div>
  );
}
