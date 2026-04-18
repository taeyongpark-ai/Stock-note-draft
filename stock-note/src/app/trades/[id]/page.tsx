import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import Logo from "@/components/ui/Logo";
import TradeChart from "@/components/ui/TradeChart";
import ReviewForm from "./ReviewForm";
import { getTradeById, getTradesByInstrumentId } from "@/db/queries";
import { generatePriceSeries, type Trade as MockTrade } from "@/lib/mock";
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
  const row = await getTradeById(id);
  if (!row) notFound();

  const { trade, instrument: it, review } = row;
  const now = new Date();
  const held = daysBetween(new Date(trade.executedAt), now);

  const instrumentRows = await getTradesByInstrumentId(trade.instrumentId);
  const instrumentTrades = instrumentRows.map((r) => r.trade);

  const opportunity = (it.currentPrice - trade.price) / trade.price;
  const totalAmount = trade.price * trade.quantity;

  // generatePriceSeries는 mock 타입을 기대하므로 DB 데이터를 호환 형태로 변환
  const mockInstrument = {
    id: it.id,
    symbol: it.symbol,
    name: it.name,
    market: it.market,
    currency: it.currency,
    color: it.color,
    currentPrice: it.currentPrice,
    dayChange: it.dayChange,
  };
  const mockTrades: MockTrade[] = instrumentTrades.map((t) => ({
    id: t.id,
    instrumentId: t.instrumentId,
    side: t.side,
    quantity: t.quantity,
    price: t.price,
    fee: t.fee,
    executedAt: t.executedAt,
    thesis: t.thesis,
    confidence: t.confidence as 1 | 2 | 3 | 4 | 5,
    tags: (t.tags as string[]) ?? [],
    fxToKrw: t.fxToKrw ?? undefined,
    review: (() => {
      const r = instrumentRows.find((row) => row.trade.id === t.id)?.review;
      if (!r) return undefined;
      return {
        tradeId: r.tradeId,
        reviewedAt: r.reviewedAt,
        verdict: r.verdict,
        reflection: r.reflection,
        counterfactualPrice: r.counterfactualPrice ?? undefined,
        counterfactualAt: r.counterfactualAt ?? undefined,
      };
    })(),
  }));

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
      </Card>

      {/* 주가 차트 */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-[15px]">주가 흐름</span>
          <span className="text-[11px] text-[color:var(--text-subtle)]">
            미리보기용 가상 시계열
          </span>
        </div>
        <TradeChart
          series={generatePriceSeries(mockInstrument, mockTrades, now)}
          markers={mockTrades.map((t) => ({
            date: t.executedAt,
            price: t.price,
            side: t.side,
            current: t.id === trade.id,
          }))}
        />
        <div className="flex justify-between mt-2 text-[11px] text-[color:var(--text-muted)] tabular">
          <span>
            {formatDateKo(
              new Date(
                new Date(instrumentTrades[0].executedAt).getTime() - 30 * 86400000
              )
            )}
          </span>
          <span>
            매수 {instrumentTrades.filter((t) => t.side === "BUY").length}회
            {" · "}
            매도 {instrumentTrades.filter((t) => t.side === "SELL").length}회
          </span>
          <span>오늘</span>
        </div>

        {/* 체결 정보 */}
        <div className="mt-5 pt-5 border-t border-[color:var(--border)] grid grid-cols-2 gap-4">
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

      {/* 매매 이유 (종목별 전체 이력) */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-[color:var(--accent)]" />
          <span className="font-bold text-[15px]">매매 이유</span>
          {instrumentRows.length > 1 && (
            <span className="text-[11px] text-[color:var(--text-subtle)] ml-1">
              총 {instrumentRows.length}건
            </span>
          )}
        </div>
        <div className="space-y-5">
          {instrumentRows.map(({ trade: t, instrument: ins, review: r }, i) => (
            <div
              key={t.id}
              className={i > 0 ? "pt-5 border-t border-[color:var(--border)]" : ""}
            >
              <div className="flex items-center flex-wrap gap-2 mb-2">
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    t.side === "BUY"
                      ? "bg-[color:var(--up-bg)] text-[color:var(--up)]"
                      : "bg-[color:var(--down-bg)] text-[color:var(--down)]"
                  }`}
                >
                  {t.side === "BUY" ? "매수" : "매도"}
                </span>
                <span className="text-[13px] font-semibold tabular">
                  {formatDateKo(new Date(t.executedAt))}
                </span>
                <span className="text-xs text-[color:var(--text-muted)] tabular">
                  {t.quantity}
                  {ins.currency === "USDT" ? "" : "주"} @{" "}
                  {t.price.toLocaleString()}
                  {ins.currency === "KRW" ? "원" : ""}
                </span>
                <span className="text-[11px] text-[color:var(--text-subtle)] tabular">
                  {"●".repeat(t.confidence)}
                  {"○".repeat(5 - t.confidence)}
                </span>
                {t.id === trade.id && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-[color:var(--accent)] text-white">
                    지금 보는 중
                  </span>
                )}
              </div>
              <p className="text-[14px] leading-relaxed whitespace-pre-wrap">
                &ldquo;{t.thesis}&rdquo;
              </p>
              {((t.tags as string[]) ?? []).length > 0 && (
                <div className="mt-2 flex gap-1.5 flex-wrap">
                  {(t.tags as string[]).map((tg) => (
                    <span
                      key={tg}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-[color:var(--card-muted)] text-[color:var(--text-muted)]"
                    >
                      #{tg}
                    </span>
                  ))}
                </div>
              )}
              {r && (
                <div className="mt-3 p-3 rounded-xl border border-[color:var(--border)] bg-gradient-to-br from-white to-[#F3F8F5]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        r.verdict === "GOOD"
                          ? "bg-[color:var(--up-bg)] text-[color:var(--up)]"
                          : r.verdict === "BAD"
                          ? "bg-[color:var(--down-bg)] text-[color:var(--down)]"
                          : "bg-[color:var(--card-muted)] text-[color:var(--text-muted)]"
                      }`}
                    >
                      {r.verdict === "GOOD"
                        ? "👍 잘한 매매"
                        : r.verdict === "BAD"
                        ? "👎 아쉬운 매매"
                        : "— 보통"}
                    </span>
                    <span className="text-[11px] text-[color:var(--text-muted)]">
                      {formatDateKo(new Date(r.reviewedAt))} 복기
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
                    {r.reflection}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* 복기 작성 (현재 거래에 복기가 없을 때만) */}
      {!review && <ReviewForm tradeId={trade.id} />}
    </div>
  );
}
