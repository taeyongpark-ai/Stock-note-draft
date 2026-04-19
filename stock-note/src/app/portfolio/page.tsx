export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import Logo from "@/components/ui/Logo";
import TopTabs from "@/components/shell/TopTabs";
import { getPortfolio } from "@/db/queries";
import type { Position } from "@/lib/portfolio";
import { formatMoney, formatPct, deltaClass, deltaArrow } from "@/lib/format";

function formatNative(v: number, currency: string): string {
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
  return v.toLocaleString("ko-KR") + "원";
}

function formatKRWAmount(v: number): string {
  return Math.round(v).toLocaleString("ko-KR") + "원";
}

function PositionList({
  positions,
  usdKrw,
}: {
  positions: Position[];
  usdKrw: number;
}) {
  return (
    <div>
      {positions.map((p, i) => {
        const isKRW = p.instrument.currency === "KRW";
        const unit = p.instrument.currency === "USDT" ? "" : "주";
        const krwCurrentPerShare =
          p.instrument.currentPrice * (isKRW ? 1 : usdKrw);
        return (
          <Link
            key={p.instrument.id}
            href={`/trend/${p.instrument.id}`}
            className={`flex items-start gap-3 px-5 py-3.5 ${
              i !== positions.length - 1
                ? "border-b border-[color:var(--border)]"
                : ""
            }`}
          >
            <Logo name={p.instrument.name} color={p.instrument.color} size={44} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-[15px] truncate">
                    {p.instrument.name}
                  </div>
                  <div className="text-xs text-[color:var(--text-muted)] mt-0.5 tabular">
                    {p.quantity}
                    {unit}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[15px] font-bold tabular">
                    {formatMoney(p.krwMarketValue)}
                  </div>
                  <div
                    className={`text-[13px] font-semibold tabular ${deltaClass(
                      p.krwUnrealized
                    )}`}
                  >
                    {deltaArrow(p.krwUnrealized)} {formatPct(p.krwUnrealizedPct)}
                  </div>
                </div>
              </div>
              <div className="text-xs text-[color:var(--text-muted)] mt-1.5 tabular">
                매입 {formatNative(p.avgCost, p.instrument.currency)}
                {" · "}
                현재 {formatNative(p.instrument.currentPrice, p.instrument.currency)}
              </div>
              {!isKRW && (
                <div className="text-xs text-[color:var(--text-muted)] mt-0.5 tabular">
                  매입 {formatKRWAmount(p.krwAvgCost)}
                  {" · "}
                  현재 {formatKRWAmount(krwCurrentPerShare)}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default async function PortfolioPage() {
  const { positions, cash, summary, usdKrw } = await getPortfolio();

  const domestic = positions.filter((p) => p.instrument.currency === "KRW");
  const foreign = positions.filter((p) => p.instrument.currency !== "KRW");
  const cashByCurrency = new Map(cash.map((c) => [c.currency, c.amount]));
  const krwCash = cashByCurrency.get("KRW") ?? 0;
  const usdCash = cashByCurrency.get("USD") ?? 0;

  return (
    <div className="space-y-4 pt-2">
      <TopTabs />

      <Card className="px-5 py-5">
        <div className="text-sm text-[color:var(--text-muted)]">총 평가금액</div>
        <div className="mt-1 text-[32px] font-black tabular leading-tight">
          {formatMoney(summary.total)}
        </div>
        <div
          className={`text-[15px] font-semibold tabular ${deltaClass(summary.unrealized)}`}
        >
          {deltaArrow(summary.unrealized)} {formatMoney(Math.abs(summary.unrealized))}{" "}
          ({formatPct(summary.unrealizedPct)})
        </div>
      </Card>

      {/* 현금 잔고 */}
      {(krwCash > 0 || usdCash > 0) && (
        <Card className="px-5 py-4">
          <div className="text-[15px] font-bold mb-3">현금 잔고</div>
          <div className="space-y-2">
            {krwCash > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[color:var(--text-muted)]">원화</span>
                <span className="text-[15px] font-bold tabular">
                  {formatKRWAmount(krwCash)}
                </span>
              </div>
            )}
            {usdCash > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[color:var(--text-muted)]">USD</span>
                <span className="text-[15px] font-bold tabular">
                  {formatNative(usdCash, "USD")}
                  <span className="text-xs font-normal text-[color:var(--text-muted)] ml-1">
                    ≈ {formatKRWAmount(usdCash * usdKrw)}
                  </span>
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {positions.length > 0 && (
        <Card className="py-1">
          <div className="px-5 pt-4 pb-2 text-[15px] font-bold">내 주식</div>

          {domestic.length > 0 && (
            <>
              <div className="px-5 py-2 text-xs font-semibold text-[color:var(--text-muted)] bg-[color:var(--surface-raised)] border-y border-[color:var(--border)]">
                국내주식
              </div>
              <PositionList positions={domestic} usdKrw={usdKrw} />
            </>
          )}

          {foreign.length > 0 && (
            <>
              <div
                className={`px-5 py-2 text-xs font-semibold text-[color:var(--text-muted)] bg-[color:var(--surface-raised)] border-[color:var(--border)] ${
                  domestic.length > 0 ? "border-t" : ""
                } border-b`}
              >
                해외주식
              </div>
              <PositionList positions={foreign} usdKrw={usdKrw} />
            </>
          )}
        </Card>
      )}

      {positions.length === 0 && (
        <Card className="px-5 py-10 text-center text-sm text-[color:var(--text-muted)]">
          보유 종목이 없어요. 매매를 등록하면 여기에 표시됩니다.
        </Card>
      )}
    </div>
  );
}
