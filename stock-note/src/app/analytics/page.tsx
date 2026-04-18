import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TRADES, inst, toKRW } from "@/lib/mock";
import { formatMoney, formatPct, deltaClass, deltaArrow } from "@/lib/format";
import Logo from "@/components/ui/Logo";

export default function AnalyticsPage() {
  // 확신도별 건수
  const byConf = [1, 2, 3, 4, 5].map((n) => ({
    n,
    count: TRADES.filter((t) => t.confidence === n).length,
  }));
  const maxConf = Math.max(...byConf.map((x) => x.count), 1);

  // 태그별 건수 (상위 6)
  const tagMap = new Map<string, number>();
  for (const t of TRADES) for (const tg of t.tags) tagMap.set(tg, (tagMap.get(tg) ?? 0) + 1);
  const topTags = [...tagMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  // 복기 완료율
  const reviewedCount = TRADES.filter((t) => t.review).length;
  const reviewable = TRADES.filter((t) => t.side === "SELL").length;
  const reviewRate = reviewable > 0 ? reviewedCount / reviewable : 0;

  // 승률 (리뷰된 것 중 GOOD 비율)
  const reviewed = TRADES.filter((t) => t.review);
  const winRate =
    reviewed.length > 0
      ? reviewed.filter((t) => t.review!.verdict === "GOOD").length / reviewed.length
      : 0;

  // 기회비용 합계 (매도 거래 기준)
  let oppCostKRW = 0;
  for (const t of TRADES) {
    if (t.side !== "SELL") continue;
    const it = inst(t.instrumentId);
    const miss = (it.currentPrice - t.price) * t.quantity;
    oppCostKRW += toKRW(miss, it.currency);
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="flex gap-5 px-1 text-lg font-bold">
        <Link href="/" className="text-[color:var(--text-subtle)]">홈</Link>
        <Link href="/trades" className="text-[color:var(--text-subtle)]">매매일지</Link>
        <span className="text-[color:var(--text)]">분석</span>
      </div>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="px-4 py-4">
          <div className="text-xs text-[color:var(--text-muted)]">총 매매</div>
          <div className="text-[28px] font-black tabular mt-0.5">{TRADES.length}</div>
          <div className="text-xs text-[color:var(--text-muted)] mt-1">
            매수 {TRADES.filter((t) => t.side === "BUY").length} · 매도{" "}
            {TRADES.filter((t) => t.side === "SELL").length}
          </div>
        </Card>
        <Card className="px-4 py-4">
          <div className="text-xs text-[color:var(--text-muted)]">복기 완료율</div>
          <div className="text-[28px] font-black tabular mt-0.5">
            {Math.round(reviewRate * 100)}%
          </div>
          <div className="text-xs text-[color:var(--text-muted)] mt-1">
            {reviewedCount} / {reviewable}
          </div>
        </Card>
        <Card className="px-4 py-4">
          <div className="text-xs text-[color:var(--text-muted)]">복기 기준 승률</div>
          <div className={`text-[28px] font-black tabular mt-0.5 ${deltaClass(winRate - 0.5)}`}>
            {Math.round(winRate * 100)}%
          </div>
          <div className="text-xs text-[color:var(--text-muted)] mt-1">
            "잘한 매매" 비율
          </div>
        </Card>
        <Card className="px-4 py-4">
          <div className="text-xs text-[color:var(--text-muted)]">기회비용 (매도)</div>
          <div className={`text-[22px] font-black tabular mt-0.5 ${deltaClass(oppCostKRW)}`}>
            {deltaArrow(oppCostKRW)} {formatMoney(Math.abs(oppCostKRW))}
          </div>
          <div className="text-xs text-[color:var(--text-muted)] mt-1">
            안 팔았더라면 지금과의 차이
          </div>
        </Card>
      </div>

      {/* 확신도 분포 */}
      <Card className="p-5">
        <div className="font-bold text-[15px] mb-4">확신도 분포</div>
        <div className="space-y-2">
          {byConf.map((b) => (
            <div key={b.n} className="flex items-center gap-3">
              <div className="w-6 text-xs text-[color:var(--text-muted)]">{b.n}</div>
              <div className="flex-1 h-2.5 bg-[color:var(--card-muted)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[color:var(--accent)]"
                  style={{ width: `${(b.count / maxConf) * 100}%` }}
                />
              </div>
              <div className="w-8 text-right text-xs tabular">{b.count}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* 태그별 */}
      <Card className="p-5">
        <div className="font-bold text-[15px] mb-3">자주 쓰는 태그</div>
        <div className="flex gap-2 flex-wrap">
          {topTags.map(([tg, c]) => (
            <span
              key={tg}
              className="px-3 py-1.5 rounded-full bg-[color:var(--card-muted)] text-sm"
            >
              #{tg}{" "}
              <span className="text-[color:var(--text-subtle)] tabular">{c}</span>
            </span>
          ))}
        </div>
      </Card>

      {/* 종목별 기여도 */}
      <Card className="p-5">
        <div className="font-bold text-[15px] mb-3">종목별 매매 건수</div>
        <div className="space-y-3">
          {[...new Set(TRADES.map((t) => t.instrumentId))].map((iid) => {
            const i = inst(iid);
            const count = TRADES.filter((t) => t.instrumentId === iid).length;
            return (
              <div key={iid} className="flex items-center gap-3">
                <Logo name={i.name} color={i.color} size={32} />
                <div className="flex-1 text-[14px] font-semibold truncate">{i.name}</div>
                <div className="text-xs text-[color:var(--text-muted)] tabular">
                  {count}건
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
