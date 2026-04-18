import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import Logo from "@/components/ui/Logo";
import TradeChart from "@/components/ui/TradeChart";
import {
  INSTRUMENTS,
  TRADES,
  eventsFor,
  catalystFor,
  generatePriceSeries,
  type MarketEvent,
  type NewsCategory,
  type NewsImpact,
} from "@/lib/mock";
import { formatPct, deltaClass, deltaArrow, formatDateKo } from "@/lib/format";
import { ChevronLeft, TrendingUp, TrendingDown, Newspaper } from "lucide-react";

type Props = PageProps<"/trend/[id]">;

function dominantImpact(e: MarketEvent): NewsImpact {
  let pos = 0;
  let neg = 0;
  for (const n of e.news) {
    if (n.impact === "POSITIVE") pos++;
    else if (n.impact === "NEGATIVE") neg++;
  }
  if (pos > neg) return "POSITIVE";
  if (neg > pos) return "NEGATIVE";
  return "NEUTRAL";
}

const CATEGORY_LABEL: Record<NewsCategory, string> = {
  STOCK: "종목",
  FX: "환율",
  COMMODITY: "원자재",
  MACRO: "매크로",
  SECTOR: "섹터",
};

function impactDot(impact: NewsImpact): { color: string; label: string } {
  if (impact === "POSITIVE") return { color: "var(--up)", label: "긍정" };
  if (impact === "NEGATIVE") return { color: "var(--down)", label: "부정" };
  return { color: "var(--text-subtle)", label: "중립" };
}

export default async function TrendDetail({ params }: Props) {
  const { id } = await params;
  const it = INSTRUMENTS.find((i) => i.id === id);
  if (!it) notFound();

  const now = new Date("2026-04-18T10:16:00+09:00");
  const trades = TRADES.filter((t) => t.instrumentId === id).sort((a, b) =>
    a.executedAt.localeCompare(b.executedAt)
  );
  const events = eventsFor(id); // 최신순
  const eventsAsc = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const catalyst = catalystFor(id);

  const series = generatePriceSeries(it, trades, now, eventsAsc);

  // 차트용 마커: 매매 + 이벤트
  const tradeMarkers = trades.map((t) => ({
    date: t.executedAt,
    price: t.price,
    kind: "TRADE" as const,
    side: t.side,
  }));
  const eventMarkers = events.map((e) => {
    // 이벤트 가격은 series에서 그 날짜에 해당하는 값을 찾아 씀 (anchor되어 있음)
    const iso = new Date(e.date).toISOString();
    const target = new Date(e.date).getTime();
    let nearest = series[0];
    let minDiff = Infinity;
    for (const p of series) {
      const d = Math.abs(new Date(p.date).getTime() - target);
      if (d < minDiff) {
        minDiff = d;
        nearest = p;
      }
    }
    return {
      date: iso,
      price: nearest?.price ?? it.currentPrice,
      kind: "EVENT" as const,
      dominantImpact: dominantImpact(e),
    };
  });

  const priceLabel =
    it.currency === "KRW"
      ? `${it.currentPrice.toLocaleString("ko-KR")}원`
      : it.currency === "USD"
      ? `$${it.currentPrice.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : `${it.currentPrice.toLocaleString()} ${it.currency}`;

  return (
    <div className="space-y-4 pt-2 pb-4">
      <div className="flex items-center gap-2">
        <Link href="/trend" className="w-9 h-9 -ml-2 grid place-items-center">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-[20px] font-extrabold">{it.name}</h1>
      </div>

      {/* 종목 헤더 */}
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <Logo name={it.name} color={it.color} size={52} />
          <div className="flex-1">
            <div className="font-extrabold text-[18px]">{it.name}</div>
            <div className="text-xs text-[color:var(--text-muted)] mt-0.5">
              {it.market} · {it.symbol}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-end gap-3">
          <div className="text-[30px] font-black tabular leading-none">
            {priceLabel}
          </div>
          <div
            className={`pb-1 text-[15px] font-semibold tabular ${deltaClass(
              it.dayChange
            )}`}
          >
            {deltaArrow(it.dayChange)} {formatPct(it.dayChange)}
          </div>
        </div>
      </Card>

      {/* 차트 */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-[15px]">주가 흐름</span>
          <span className="text-[11px] text-[color:var(--text-subtle)]">
            미리보기용 가상 시계열
          </span>
        </div>
        <TradeChart
          series={series}
          markers={[...tradeMarkers, ...eventMarkers]}
        />
        <div className="flex items-center gap-4 mt-3 text-[11px] text-[color:var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "var(--up)" }}
            />
            매수
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "var(--down)" }}
            />
            매도
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full border-2"
              style={{ borderColor: "var(--up)", backgroundColor: "white" }}
            />
            호재 이벤트
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full border-2"
              style={{ borderColor: "var(--down)", backgroundColor: "white" }}
            />
            악재 이벤트
          </span>
        </div>
      </Card>

      {/* 이벤트 카드 — 최신순 */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Newspaper size={18} className="text-[color:var(--accent)]" />
          <span className="font-bold text-[15px]">±3% 이상 등락일 뉴스</span>
          {events.length > 0 && (
            <span className="text-[11px] text-[color:var(--text-subtle)] ml-1">
              {events.length}건
            </span>
          )}
        </div>
        {events.length === 0 ? (
          <div className="py-8 text-sm text-[color:var(--text-muted)] text-center">
            아직 기록된 이벤트가 없습니다.
          </div>
        ) : (
          <div className="space-y-5">
            {events.map((e, i) => {
              const isUp = e.dayChangePct >= 0;
              return (
                <div
                  key={e.date}
                  className={
                    i > 0
                      ? "pt-5 border-t border-[color:var(--border)]"
                      : ""
                  }
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[13px] font-bold tabular">
                      {e.date}
                    </span>
                    <span
                      className={`text-[12px] font-bold tabular px-2 py-0.5 rounded ${
                        isUp
                          ? "bg-[color:var(--up-bg)] text-[color:var(--up)]"
                          : "bg-[color:var(--down-bg)] text-[color:var(--down)]"
                      }`}
                    >
                      {deltaArrow(e.dayChangePct)} {formatPct(e.dayChangePct)}
                    </span>
                  </div>
                  <p className="text-[14px] leading-relaxed text-[color:var(--text)] mb-3">
                    {e.summary}
                  </p>
                  <ul className="space-y-2">
                    {e.news.map((n, j) => {
                      const dot = impactDot(n.impact);
                      return (
                        <li
                          key={j}
                          className="flex items-start gap-2 text-[13px] leading-relaxed"
                        >
                          <span
                            className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: dot.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[color:var(--card-muted)] text-[color:var(--text-muted)] mr-1.5">
                              {CATEGORY_LABEL[n.category]}
                            </span>
                            <span className="text-[color:var(--text)]">
                              {n.headline}
                            </span>
                            <span className="text-[11px] text-[color:var(--text-subtle)] ml-1.5">
                              · {n.source} · {dot.label}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* 호재/악재 요약 */}
      {catalyst && (
        <Card className="p-5">
          <div className="font-bold text-[15px] mb-4">호재 / 악재</div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl p-4 bg-[color:var(--up-bg)]">
              <div className="flex items-center gap-1.5 text-[13px] font-bold text-[color:var(--up)] mb-2">
                <TrendingUp size={16} />
                호재
              </div>
              <ul className="space-y-1.5">
                {catalyst.positives.map((p, i) => (
                  <li
                    key={i}
                    className="text-[13px] leading-relaxed text-[color:var(--text)]"
                  >
                    + {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl p-4 bg-[color:var(--down-bg)]">
              <div className="flex items-center gap-1.5 text-[13px] font-bold text-[color:var(--down)] mb-2">
                <TrendingDown size={16} />
                악재
              </div>
              <ul className="space-y-1.5">
                {catalyst.negatives.map((p, i) => (
                  <li
                    key={i}
                    className="text-[13px] leading-relaxed text-[color:var(--text)]"
                  >
                    − {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
