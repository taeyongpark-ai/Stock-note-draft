"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import Logo from "@/components/ui/Logo";
import {
  formatMoney,
  formatPct,
  deltaClass,
  deltaArrow,
  formatDateKo,
  daysBetween,
} from "@/lib/format";
import type { InferSelectModel } from "drizzle-orm";
import type { trades, instruments, reviews } from "@/db/schema";

type Row = {
  trade: InferSelectModel<typeof trades>;
  instrument: InferSelectModel<typeof instruments>;
  review: InferSelectModel<typeof reviews> | null;
};

type Filter = "ALL" | "BUY" | "SELL" | "NEED_REVIEW";

const REVIEW_DAYS = 7;

export default function TradeList({ rows }: { rows: Row[] }) {
  const [f, setF] = useState<Filter>("ALL");
  const now = new Date();

  const pendingIds = useMemo(
    () =>
      new Set(
        rows
          .filter(
            ({ trade, review }) =>
              !review && daysBetween(new Date(trade.executedAt), now) >= REVIEW_DAYS
          )
          .map(({ trade }) => trade.id)
      ),
    [rows]
  );

  const filtered = useMemo(() => {
    if (f === "BUY") return rows.filter(({ trade }) => trade.side === "BUY");
    if (f === "SELL") return rows.filter(({ trade }) => trade.side === "SELL");
    if (f === "NEED_REVIEW") return rows.filter(({ trade }) => pendingIds.has(trade.id));
    return rows;
  }, [f, rows, pendingIds]);

  return (
    <div className="space-y-4">
      <div className="-mx-4 px-4 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <Chip active={f === "ALL"} onClick={() => setF("ALL")}>
            전체 {rows.length}
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
        {filtered.map(({ trade, instrument: it, review }, i) => {
          const needReview = pendingIds.has(trade.id);
          return (
            <Link
              key={trade.id}
              href={`/trades/${trade.id}`}
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
                        trade.side === "BUY"
                          ? "bg-[color:var(--up-bg)] text-[color:var(--up)]"
                          : "bg-[color:var(--down-bg)] text-[color:var(--down)]"
                      }`}
                    >
                      {trade.side === "BUY" ? "매수" : "매도"}
                    </span>
                    <span className="font-semibold text-[15px] truncate">{it.name}</span>
                    {review && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[color:var(--card-muted)] text-[color:var(--text-muted)]">
                        복기완료
                      </span>
                    )}
                    {needReview && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FEF5E7] text-[#B8860B]">
                        복기필요 {daysBetween(new Date(trade.executedAt), now)}일
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[color:var(--text-muted)] mt-1 truncate">
                    {formatDateKo(new Date(trade.executedAt))} · {trade.quantity}
                    {it.currency === "USDT" ? "" : "주"} @{" "}
                    {trade.price.toLocaleString()}
                    {it.currency === "KRW" ? "원" : it.currency === "USD" ? "$" : ""}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[14px] font-bold tabular">
                    {formatMoney(trade.price * trade.quantity, it.currency)}
                  </div>
                  {review?.counterfactualPrice && (
                    <div
                      className={`text-[11px] tabular ${deltaClass(
                        review.counterfactualPrice - trade.price
                      )}`}
                    >
                      기회 {deltaArrow(review.counterfactualPrice - trade.price)}{" "}
                      {formatPct((review.counterfactualPrice - trade.price) / trade.price)}
                    </div>
                  )}
                </div>
              </div>
              {trade.thesis && (
                <div className="mt-2.5 text-[13px] text-[color:var(--text-muted)] line-clamp-2">
                  &ldquo;{trade.thesis}&rdquo;
                </div>
              )}
              {(trade.tags as string[]).length > 0 && (
                <div className="mt-2 flex gap-1.5 flex-wrap">
                  {(trade.tags as string[]).map((tg) => (
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
