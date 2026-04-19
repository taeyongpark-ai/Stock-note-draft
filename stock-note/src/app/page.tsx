export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import Sparkline from "@/components/ui/Sparkline";
import Logo from "@/components/ui/Logo";
import TopTabs from "@/components/shell/TopTabs";
import {
  getPortfolio,
  getRecentTrades,
  getPendingReviewTrades,
  getMarketIndices,
  getMonthlyLlmUsage,
} from "@/db/queries";
import {
  formatMoney,
  formatPct,
  deltaClass,
  deltaArrow,
  formatDateKo,
  daysBetween,
} from "@/lib/format";
import { ArrowRight, Clock } from "lucide-react";

export default async function Home() {
  const now = new Date();
  const [{ summary, usdKrw }, recent, pending, indices, llm] = await Promise.all([
    getPortfolio(),
    getRecentTrades(3),
    getPendingReviewTrades(now),
    getMarketIndices(),
    getMonthlyLlmUsage(),
  ]);
  const llmWarn = llm.todayUsd >= 0.8; // 일일 캡 $1 중 80% 넘으면 경고
  const toKRW = (amount: number, currency: string) =>
    currency === "KRW" ? amount : amount * usdKrw;

  return (
    <div className="space-y-4 pt-2">
      {/* 상단 탭 */}
      <TopTabs />

      {/* 총자산 카드 */}
      <Card className="px-5 py-5">
        <div className="text-sm text-[color:var(--text-muted)]">총 평가금액</div>
        <div className="mt-1.5 text-[34px] font-black tabular leading-tight">
          {formatMoney(summary.total)}
        </div>
        <div
          className={`mt-1 text-[15px] font-semibold tabular ${deltaClass(summary.unrealized)}`}
        >
          {deltaArrow(summary.unrealized)} {formatMoney(Math.abs(summary.unrealized))}{" "}
          ({formatPct(summary.unrealizedPct)})
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
      {pending.length > 0 && (
        <Link href={`/trades/${pending[0].trade.id}`}>
          <Card className="px-5 py-4 flex items-center gap-3 bg-gradient-to-r from-[#F7F3E8] to-[#FEF5E7] border-[#F0E4C2]">
            <div className="w-10 h-10 rounded-full bg-[#F4C430] grid place-items-center">
              <Clock size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold">복기 대기 {pending.length}건</div>
              <div className="text-xs text-[color:var(--text-muted)] truncate">
                {pending[0].instrument.name} 매도 후{" "}
                {daysBetween(new Date(pending[0].trade.executedAt), now)}일 경과
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

      {/* AI 사용량 배너 (임계치 넘으면 경고) */}
      {llm.monthCalls > 0 && (
        <div
          className={`text-[11px] px-3 py-1.5 rounded-lg tabular text-center ${
            llmWarn
              ? "bg-[color:var(--down-bg)] text-[color:var(--down)] font-bold"
              : "bg-[color:var(--card-muted)] text-[color:var(--text-subtle)]"
          }`}
        >
          {llmWarn && "⚠️ "}AI 요약 이번 달 ${llm.monthTotalUsd.toFixed(3)} · 오늘 ${llm.todayUsd.toFixed(3)} ({llm.monthCalls}회)
          {llmWarn && " — 일일 $1 캡 근접"}
        </div>
      )}

      {/* 지수 미니카드 (DB from Yahoo Finance) */}
      <div className="-mx-4 px-4 overflow-x-auto">
        <div className="flex gap-3 min-w-max pb-1">
          {indices.map((s) => (
            <Card key={s.code} className="w-[160px] shrink-0 px-4 py-3.5">
              <div className="text-[13px] text-[color:var(--text-muted)]">
                <span className="mr-1">{s.flag}</span>
                {s.name}
              </div>
              <div className="mt-1 text-[22px] font-extrabold tabular">
                {s.value > 0
                  ? s.value.toLocaleString(undefined, {
                      maximumFractionDigits: s.code === "USDKRW" ? 2 : 0,
                    })
                  : "—"}
              </div>
              <div
                className={`text-[13px] font-semibold tabular ${deltaClass(s.dayChange)}`}
              >
                {deltaArrow(s.dayChange)} {formatPct(s.dayChange)}
              </div>
              {(s.sparklinePoints as number[]).length > 0 && (
                <div className="mt-2">
                  <Sparkline
                    points={s.sparklinePoints as number[]}
                    width={128}
                    height={32}
                  />
                </div>
              )}
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
          {recent.length === 0 && (
            <div className="px-5 py-8 text-sm text-[color:var(--text-muted)] text-center">
              매매 기록이 아직 없어요.
            </div>
          )}
          {recent.map(({ trade: t, instrument: it }, i) => {
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
