import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { instruments, priceHistory, watchlist, trades, marketEvents } from "@/db/schema";
import { eq, gte, inArray, asc } from "drizzle-orm";
import { processEvent, EVENT_THRESHOLD } from "@/lib/detect-events";
import { isDailyCapReached } from "@/lib/summarize";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * 2025-01-01 이후 3%+ 등락 백필. 관심종목 + 보유종목만 대상.
 * 1회 실행당 최대 N건까지만 처리 (Vercel 함수 타임아웃 + 비용 관리).
 *
 * 사용법:
 *   curl -H "Authorization: Bearer <CRON_SECRET>" \
 *        "https://.../api/cron/backfill-events?limit=30&from=2025-01-01"
 *
 * 계속 같은 요청을 보내면 이미 처리된 것은 skip 되므로 안전하게 반복 가능.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const limit = Math.min(
    Number(req.nextUrl.searchParams.get("limit") ?? 30),
    50
  );
  const fromDate = req.nextUrl.searchParams.get("from") ?? "2025-01-01";

  // 관심종목 + 보유종목 (trades가 있는 종목)
  const [watched, tradedRows, allInsts] = await Promise.all([
    db.select().from(watchlist),
    db.select({ id: trades.instrumentId }).from(trades),
    db.select().from(instruments),
  ]);
  const targetIds = new Set<string>();
  watched.forEach((w) => targetIds.add(w.instrumentId));
  tradedRows.forEach((r) => targetIds.add(r.id));

  if (targetIds.size === 0) {
    return NextResponse.json({ processed: 0, message: "no target instruments" });
  }

  const targetInsts = allInsts.filter((i) => targetIds.has(i.id));

  // 대상 종목들의 price_history에서 전일 대비 3%+ 인 날짜 찾기
  const bars = await db
    .select()
    .from(priceHistory)
    .where(
      inArray(
        priceHistory.instrumentId,
        Array.from(targetIds)
      )
    );
  // instrumentId별 그룹화 후 날짜순 정렬
  const byInst = new Map<string, typeof bars>();
  for (const b of bars) {
    if (b.date < fromDate) continue;
    const arr = byInst.get(b.instrumentId) ?? [];
    arr.push(b);
    byInst.set(b.instrumentId, arr);
  }
  for (const arr of byInst.values()) {
    arr.sort((a, b) => a.date.localeCompare(b.date));
  }

  // 대기열 생성: 3%+ 등락일 (오름차순으로 처리)
  type Candidate = { instId: string; date: string; pct: number };
  const queue: Candidate[] = [];
  for (const [instId, arr] of byInst) {
    for (let i = 1; i < arr.length; i++) {
      const prev = arr[i - 1].close;
      const curr = arr[i].close;
      if (prev <= 0) continue;
      const pct = (curr - prev) / prev;
      if (Math.abs(pct) >= EVENT_THRESHOLD) {
        queue.push({ instId, date: arr[i].date, pct });
      }
    }
  }
  queue.sort((a, b) => a.date.localeCompare(b.date));

  // 이미 처리된 이벤트 ID 미리 로드 → 큐에서 제거
  const existingEvents = await db.select({ id: marketEvents.id }).from(marketEvents);
  const existingIds = new Set(existingEvents.map((e) => e.id));
  const pending = queue.filter((c) => !existingIds.has(`${c.instId}-${c.date}`));

  const results: Array<{
    instId: string;
    date: string;
    pct: number;
    status: string;
    news?: number;
  }> = [];
  const instMap = new Map(targetInsts.map((i) => [i.id, i]));

  let processedCount = 0;
  for (const c of pending) {
    if (processedCount >= limit) break;
    if (await isDailyCapReached()) {
      results.push({
        instId: c.instId,
        date: c.date,
        pct: c.pct,
        status: "daily-cap-reached",
      });
      break;
    }
    const inst = instMap.get(c.instId);
    if (!inst) continue;
    const r = await processEvent(inst, c.date, c.pct);
    results.push({
      instId: c.instId,
      date: c.date,
      pct: c.pct,
      status: r.ok ? "ok" : r.skipped ?? "unknown",
      news: r.news,
    });
    if (r.ok) processedCount++;
  }

  return NextResponse.json({
    totalCandidates: queue.length,
    alreadyProcessed: queue.length - pending.length,
    pendingBefore: pending.length,
    processed: processedCount,
    limit,
    fromDate,
    results,
  });
}
