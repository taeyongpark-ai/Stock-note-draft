import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import Logo from "@/components/ui/Logo";
import { getTrade, inst } from "@/lib/mock";
import {
  formatMoney,
  formatPct,
  deltaClass,
  deltaArrow,
  formatDateKo,
  daysBetween,
} from "@/lib/format";
import { ChevronLeft, TrendingUp, Sparkles } from "lucide-react";

type Props = PageProps<"/trades/[id]">;

export default async function TradeDetail({ params }: Props) {
  const { id } = await params;
  const trade = getTrade(id);
  if (!trade) notFound();
  const it = inst(trade.instrumentId);
  const now = new Date("2026-04-18T10:16:00+09:00");
  const held = daysBetween(new Date(trade.executedAt), now);

  // 기회비용: 매도 거래라면 "안 팔았으면" 현재가 대비 차액
  const opportunity =
    trade.side === "SELL"
      ? (it.currentPrice - trade.price) / trade.price
      : (it.currentPrice - trade.price) / trade.price;

  const totalAmount = trade.price * trade.quantity;

  return (
    <div className="space-y-4 pt-2 pb-4">
      <div className="flex items-center gap-2">
        <Link href="/trades" className="w-9 h-9 -ml-2 grid place-items-center">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-[20px] font-extrabold">거래 상세</h1>
      </div>

      {/* 종목 헤더 */}
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <Logo name={it.name} color={it.color} size={52} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                  trade.side === "BUY"
                    ? "bg-[color:var(--up-bg)] text-[color:var(--up)]"
                    : "bg-[color:var(--down-bg)] text-[color:var(--down)]"
                }`}
              >
                {trade.side === "BUY" ? "매수" : "매도"}
              </span>
              <span className="text-[18px] font-extrabold">{it.name}</span>
            </div>
            <div className="text-xs text-[color:var(--text-muted)] mt-1">
              {it.market} · {it.symbol} · {formatDateKo(new Date(trade.executedAt))}
              {" · "}
              <span>{held}일 경과</span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-[color:var(--text-muted)]">수량</div>
            <div className="text-[18px] font-bold tabular">
              {trade.quantity}
              {it.currency === "USDT" ? "" : "주"}
            </div>
          </div>
          <div>
            <div className="text-xs text-[color:var(--text-muted)]">체결가</div>
            <div className="text-[18px] font-bold tabular">
              {trade.price.toLocaleString()}
              {it.currency === "KRW" ? "원" : ""}
            </div>
          </div>
          <div>
            <div className="text-xs text-[color:var(--text-muted)]">거래대금</div>
            <div className="text-[18px] font-bold tabular">
              {formatMoney(totalAmount, it.currency)}
            </div>
          </div>
          <div>
            <div className="text-xs text-[color:var(--text-muted)]">확신도</div>
            <div className="text-[18px] font-bold">
              {"●".repeat(trade.confidence)}
              <span className="text-[color:var(--text-subtle)]">
                {"○".repeat(5 - trade.confidence)}
              </span>
            </div>
          </div>
        </div>

        {trade.tags.length > 0 && (
          <div className="mt-4 flex gap-1.5 flex-wrap">
            {trade.tags.map((tg) => (
              <span
                key={tg}
                className="text-[12px] px-2.5 py-1 rounded-full bg-[color:var(--card-muted)] text-[color:var(--text-muted)]"
              >
                #{tg}
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* 현재가 비교 */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={18} className="text-[color:var(--accent)]" />
          <span className="font-bold text-[15px]">지금 그 종목은?</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-[color:var(--text-muted)]">당시 체결가</div>
            <div className="text-[22px] font-extrabold tabular mt-1">
              {trade.price.toLocaleString()}
              <span className="text-xs font-normal text-[color:var(--text-muted)] ml-1">
                {it.currency === "KRW" ? "원" : it.currency}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-[color:var(--text-muted)]">현재가 (지연)</div>
            <div className="text-[22px] font-extrabold tabular mt-1">
              {it.currentPrice.toLocaleString()}
              <span className="text-xs font-normal text-[color:var(--text-muted)] ml-1">
                {it.currency === "KRW" ? "원" : it.currency}
              </span>
            </div>
          </div>
        </div>

        <div
          className={`mt-4 p-4 rounded-xl ${
            opportunity > 0
              ? "bg-[color:var(--up-bg)]"
              : opportunity < 0
              ? "bg-[color:var(--down-bg)]"
              : "bg-[color:var(--card-muted)]"
          }`}
        >
          <div className="text-xs text-[color:var(--text-muted)]">
            {trade.side === "SELL" ? "안 팔았더라면" : "이후 수익률"}
          </div>
          <div className={`text-[22px] font-black tabular mt-0.5 ${deltaClass(opportunity)}`}>
            {deltaArrow(opportunity)} {formatPct(opportunity)}
          </div>
          <div className="text-xs text-[color:var(--text-muted)] mt-1">
            {trade.side === "SELL"
              ? `매도 판단 기회비용: ${formatMoney(
                  Math.abs((it.currentPrice - trade.price) * trade.quantity),
                  it.currency
                )}`
              : `매수 후 ${held}일 동안의 수익률`}
          </div>
        </div>
      </Card>

      {/* 당시 기록 */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} className="text-[color:var(--accent)]" />
          <span className="font-bold text-[15px]">당시 매매 이유</span>
        </div>
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">"{trade.thesis}"</p>
      </Card>

      {/* 복기 */}
      {trade.review ? (
        <Card className="p-5 bg-gradient-to-br from-white to-[#F2F9F4]">
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                trade.review.verdict === "GOOD"
                  ? "bg-[color:var(--up-bg)] text-[color:var(--up)]"
                  : trade.review.verdict === "BAD"
                  ? "bg-[color:var(--down-bg)] text-[color:var(--down)]"
                  : "bg-[color:var(--card-muted)] text-[color:var(--text-muted)]"
              }`}
            >
              {trade.review.verdict === "GOOD"
                ? "👍 잘한 매매"
                : trade.review.verdict === "BAD"
                ? "👎 아쉬운 매매"
                : "— 보통"}
            </span>
            <span className="text-xs text-[color:var(--text-muted)]">
              {formatDateKo(new Date(trade.review.reviewedAt))} 작성
            </span>
          </div>
          <p className="text-[14px] leading-relaxed whitespace-pre-wrap">
            {trade.review.reflection}
          </p>
        </Card>
      ) : (
        <Card className="p-5">
          <div className="font-bold text-[15px] mb-2">아직 복기 전입니다</div>
          <p className="text-sm text-[color:var(--text-muted)] mb-4">
            시간이 지났으니, 지금 돌아보면 어땠나요? 솔직하게 적어두면 다음 판단이
            달라집니다.
          </p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <button className="py-2.5 rounded-xl bg-[color:var(--up-bg)] text-[color:var(--up)] font-bold text-sm">
              👍 잘함
            </button>
            <button className="py-2.5 rounded-xl bg-[color:var(--card-muted)] text-[color:var(--text-muted)] font-bold text-sm">
              — 보통
            </button>
            <button className="py-2.5 rounded-xl bg-[color:var(--down-bg)] text-[color:var(--down)] font-bold text-sm">
              👎 아쉬움
            </button>
          </div>
          <textarea
            placeholder="그때의 판단을 지금 어떻게 평가하나요?"
            rows={4}
            className="w-full bg-[color:var(--card-muted)] rounded-xl px-4 py-3 text-[14px] resize-none outline-none"
          />
          <button className="mt-3 w-full py-3 rounded-xl bg-[color:var(--accent)] text-white font-bold text-sm">
            복기 저장
          </button>
        </Card>
      )}
    </div>
  );
}
