"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import Logo from "@/components/ui/Logo";
import TopTabs from "@/components/shell/TopTabs";
import { TRADES, inst, pendingReviews } from "@/lib/mock";
import {
  formatMoney,
  formatPct,
  deltaClass,
  deltaArrow,
  formatDateKo,
  daysBetween,
} from "@/lib/format";

type Filter = "ALL" | "BUY" | "SELL" | "NEED_REVIEW";

export default function TradesPage() {
  const [f, setF] = useState<Filter>("ALL");
  const now = new Date("2026-04-18T10:16:00+09:00");

  const pendingIds = useMemo(
    () => new Set(pendingReviews(TRADES, now).map((t) => t.id)),
    []
  );

  const filtered = useMemo(() => {
    let list = [...TRADES].sort((a, b) => b.executedAt.localeCompare(a.executedAt));
    if (f === "BUY") list = list.filter((t) => t.side === "BUY");
    if (f === "SELL") list = list.filter((t) => t.side === "SELL");
    if (f === "NEED_REVIEW") list = list.filter((t) => pendingIds.has(t.id));
    return list;
  }, [f, pendingIds]);

  return (
    <div className="space-y-4 pt-2">
      <TopTabs />

      <div className="-mx-4 px-4 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <Chip active={f === "ALL"} onClick={() => setF("ALL")}>
            전체 {TRADES.length}
          </Chip>
          <Chip active={f === "BUY"} onClick={() => setF("BUY")}>
            매수
          </Chip>
          <Chip active={f === "SELL"} onClick={() => setF("SELL")}>
            매도
          </Chip>
          <Chip active={f === "NEED_REVIEW"} onClick={() => setF("NEED_REVIEW")}>
            복기 필요 {pendingIds.size}
          </Chip>
        </div>
      </div>

      <Card className="py-1">
        {filtered.map((t, i) => {
          const it = inst(t.instrumentId);
          const needReview = pendingIds.has(t.id);
          return (
            <Link
              key={t.id}
              href={`/trades/${t.id}`}
              className={`block px-5 py-4 ${
                i !== filtered.length - 1 ? "border-b border-[color:var(--border)]" : ""
              }`}
            >
              <div className="flex items-center gap-3">
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
                    {t.review && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[color:var(--card-muted)] text-[color:var(--text-muted)]">
                        복기완료
                      </span>
                    )}
                    {needReview && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FEF5E7] text-[#B8860B]">
                        복기필요 {daysBetween(new Date(t.executedAt), now)}일
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[color:var(--text-muted)] mt-1 truncate">
                    {formatDateKo(new Date(t.executedAt))} · {t.quantity}
                    {it.currency === "USDT" ? "" : "주"} @{" "}
                    {t.price.toLocaleString()}
                    {it.currency === "KRW" ? "원" : it.currency === "USD" ? "$" : ""}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[14px] font-bold tabular">
                    {formatMoney(t.price * t.quantity, it.currency)}
                  </div>
                  {t.review?.counterfactualPrice && (
                    <div
                      className={`text-[11px] tabular ${deltaClass(
                        t.review.counterfactualPrice - t.price
                      )}`}
                    >
                      기회 {deltaArrow(t.review.counterfactualPrice - t.price)}{" "}
                      {formatPct((t.review.counterfactualPrice - t.price) / t.price)}
                    </div>
                  )}
                </div>
              </div>
              {t.thesis && (
                <div className="mt-2.5 text-[13px] text-[color:var(--text-muted)] line-clamp-2">
                  "{t.thesis}"
                </div>
              )}
              {t.tags.length > 0 && (
                <div className="mt-2 flex gap-1.5 flex-wrap">
                  {t.tags.map((tg) => (
                    <span
                      key={tg}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-[color:var(--card-muted)] text-[color:var(--text-muted)]"
                    >
                      #{tg}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-[color:var(--text-muted)]">
            해당 조건의 매매가 없습니다.
          </div>
        )}
      </Card>
    </div>
  );
}
