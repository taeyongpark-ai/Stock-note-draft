import Link from "next/link";
import { Card } from "@/components/ui/Card";
import Sparkline from "@/components/ui/Sparkline";
import Logo from "@/components/ui/Logo";
import {
  computePositions,
  totalPortfolioKRW,
  pendingReviews,
  TRADES,
  inst,
  INDEX_SNAPSHOTS,
  toKRW,
} from "@/lib/mock";
import {
  formatMoney,
  formatPct,
  deltaClass,
  deltaArrow,
  formatDateKo,
  daysBetween,
} from "@/lib/format";
import { ArrowRight, Clock } from "lucide-react";

export default function Home() {
  const now = new Date("2026-04-18T10:16:00+09:00");
  const positions = computePositions();
  const total = totalPortfolioKRW(positions);
  const reviews = pendingReviews(TRADES, now);
  const recent = [...TRADES]
    .sort((a, b) => b.executedAt.localeCompare(a.executedAt))
    .slice(0, 3);

  return (
    <div className="space-y-4 pt-2">
      {/* 상단 탭 (포트폴리오/매매일지/복기/분석) */}
      <div className="flex gap-5 px-1 text-lg font-bold">
        <span className="text-[color:var(--text)]">홈</span>
        <Link href="/trades" className="text-[color:var(--text-subtle)]">
          매매일지
        </Link>
        <Link href="/analytics" className="text-[color:var(--text-subtle)]">
          분석
        </Link>
      </div>

      {/* 총자산 카드 */}
      <Card className="px-5 py-5">
        <div className="text-sm text-[color:var(--text-muted)]">총 평가금액</div>
        <div className="mt-1.5 text-[34px] font-black tabular leading-tight">
          {formatMoney(total.total)}
        </div>
        <div className={`mt-1 text-[15px] font-semibold tabular ${deltaClass(total.unrealized)}`}>
          {deltaArrow(total.unrealized)} {formatMoney(Math.abs(total.unrealized))}{" "}
          ({formatPct(total.unrealizedPct)})
        </div>
        <div className="mt-4 flex gap-2">
          <Link
            href="/portfolio"
            className="flex-1 text-center py-2.5 rounded-xl bg-[color:var(--card-muted)] text-sm font-semibold"
          >
            포트폴리오
          </Link>
          <Link
            href="/trades/new"
            className="flex-1 text-center py-2.5 rounded-xl bg-[color:var(--accent)] text-white text-sm font-semibold"
          >
            ＋ 매매 등록
          </Link>
        </div>
      </Card>

      {/* 복기 대기 배너 */}
      {reviews.length > 0 && (
        <Link href={`/trades/${reviews[0].id}`}>
          <Card className="px-5 py-4 flex items-center gap-3 bg-gradient-to-r from-[#F7F3E8] to-[#FEF5E7] border-[#F0E4C2]">
            <div className="w-10 h-10 rounded-full bg-[#F4C430] grid place-items-center">
              <Clock size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold">복기 대기 {reviews.length}건</div>
              <div className="text-xs text-[color:var(--text-muted)] truncate">
                {inst(reviews[0].instrumentId).name} 매도 후{" "}
                {daysBetween(new Date(reviews[0].executedAt), now)}일 경과
              </div>
            </div>
            <ArrowRight size={18} className="text-[color:var(--text-muted)]" />
          </Card>
        </Link>
      )}

      {/* 시장 헤더 */}
      <div className="flex items-center justify-center gap-4 text-[13px] text-[color:var(--text-muted)] py-1">
        <span>🇰🇷 KRX 휴장일</span>
        <span className="text-[color:var(--text-subtle)]">·</span>
        <span>🇺🇸 장마감</span>
      </div>

      {/* 지수 미니카드 가로 스크롤 */}
      <div className="-mx-4 px-4 overflow-x-auto">
        <div className="flex gap-3 min-w-max pb-1">
          {INDEX_SNAPSHOTS.map((s) => (
            <Card key={s.name} className="w-[160px] shrink-0 px-4 py-3.5">
              <div className="text-[13px] text-[color:var(--text-muted)]">
                <span className="mr-1">{s.flag}</span>
                {s.name}
              </div>
              <div className="mt-1 text-[22px] font-extrabold tabular">
                {s.value.toLocaleString()}
              </div>
              <div className={`text-[13px] font-semibold tabular ${deltaClass(s.change)}`}>
                {deltaArrow(s.change)} {formatPct(s.change)}
              </div>
              <div className="mt-2">
                <Sparkline points={s.points} width={128} height={32} />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 최근 매매 */}
      <Card className="py-2">
        <div className="px-5 pt-3 pb-2 flex items-center justify-between">
          <div className="text-[15px] font-bold">최근 매매</div>
          <Link href="/trades" className="text-xs text-[color:var(--text-muted)]">
            전체보기
          </Link>
        </div>
        <div>
          {recent.map((t, i) => {
            const it = inst(t.instrumentId);
            const amountKRW = toKRW(t.price * t.quantity, it.currency);
            return (
              <Link
                key={t.id}
                href={`/trades/${t.id}`}
                className={`flex items-center gap-3 px-5 py-3 ${
                  i !== recent.length - 1 ? "border-b border-[color:var(--border)]" : ""
                }`}
              >
                <Logo name={it.name} color={it.color} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                        t.side === "BUY"
                          ? "bg-[color:var(--up-bg)] text-[color:var(--up)]"
                          : "bg-[color:var(--down-bg)] text-[color:var(--down)]"
                      }`}
                    >
                      {t.side === "BUY" ? "매수" : "매도"}
                    </span>
                    <span className="font-semibold text-[15px] truncate">{it.name}</span>
                  </div>
                  <div className="text-xs text-[color:var(--text-muted)] mt-0.5 truncate">
                    {formatDateKo(new Date(t.executedAt))} · {t.quantity}
                    {it.currency === "USDT" ? "" : "주"} @{" "}
                    {t.price.toLocaleString()}
                    {it.currency === "KRW" ? "원" : it.currency === "USD" ? "$" : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[14px] font-bold tabular">
                    {formatMoney(amountKRW)}
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
