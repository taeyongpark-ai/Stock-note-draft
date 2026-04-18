import Link from "next/link";
import { Card } from "@/components/ui/Card";
import Logo from "@/components/ui/Logo";
import { computePositions, totalPortfolioKRW, toKRW } from "@/lib/mock";
import { formatMoney, formatPct, deltaClass, deltaArrow } from "@/lib/format";

export default function PortfolioPage() {
  const positions = computePositions();
  const total = totalPortfolioKRW(positions);

  return (
    <div className="space-y-4 pt-2">
      <div className="flex gap-5 px-1 text-lg font-bold">
        <Link href="/" className="text-[color:var(--text-subtle)]">홈</Link>
        <span className="text-[color:var(--text)]">내 투자</span>
        <Link href="/trades" className="text-[color:var(--text-subtle)]">매매일지</Link>
      </div>

      <Card className="px-5 py-5">
        <div className="text-sm text-[color:var(--text-muted)]">총 평가금액</div>
        <div className="mt-1 text-[32px] font-black tabular leading-tight">
          {formatMoney(total.total)}
        </div>
        <div className={`text-[15px] font-semibold tabular ${deltaClass(total.unrealized)}`}>
          {deltaArrow(total.unrealized)} {formatMoney(Math.abs(total.unrealized))}{" "}
          ({formatPct(total.unrealizedPct)})
        </div>
      </Card>

      <Card className="py-1">
        <div className="px-5 pt-4 pb-2 text-[15px] font-bold">내 주식</div>
        <div>
          {positions.map((p, i) => {
            const krw = toKRW(p.marketValue, p.instrument.currency);
            return (
              <Link
                key={p.instrument.id}
                href={`/instruments/${p.instrument.id}`}
                className={`flex items-center gap-3 px-5 py-3.5 ${
                  i !== positions.length - 1
                    ? "border-b border-[color:var(--border)]"
                    : ""
                }`}
              >
                <Logo name={p.instrument.name} color={p.instrument.color} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[15px] truncate">
                    {p.instrument.name}
                  </div>
                  <div className="text-xs text-[color:var(--text-muted)] mt-0.5">
                    {p.quantity}
                    {p.instrument.currency === "USDT" ? "" : "주"}
                    {" · "}
                    <span>평단 </span>
                    {p.avgCost.toLocaleString(undefined, {
                      maximumFractionDigits: p.instrument.currency === "KRW" ? 0 : 2,
                    })}
                    {p.instrument.currency === "KRW" ? "원" : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[15px] font-bold tabular">
                    {formatMoney(krw)}
                  </div>
                  <div className={`text-[13px] font-semibold tabular ${deltaClass(p.unrealized)}`}>
                    {deltaArrow(p.unrealized)} {formatPct(p.unrealizedPct)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
