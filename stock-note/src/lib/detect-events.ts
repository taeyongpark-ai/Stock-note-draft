/**
 * 3% 이상 등락일을 감지해 market_events + news_items에 적재.
 * - backfill: price_history 기반으로 과거 날짜들 스캔
 * - 일간: 오늘의 dayChange 기반
 *
 * 뉴스 수집: Yahoo 내장 뉴스 + 구글 뉴스 RSS (한/영) + 해외주식만 Reddit
 * 요약: OpenAI GPT-4o-mini
 */

import { db } from "@/db/client";
import { marketEvents, newsItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  fetchYahooNews,
  fetchGoogleNewsRss,
  fetchRedditPosts,
  type NewsSnippet,
} from "./news";
import { summarizeEvent } from "./summarize";
import { yahooTickerFor } from "./prices";
import type { InferSelectModel } from "drizzle-orm";
import type { instruments } from "@/db/schema";

type Instrument = InferSelectModel<typeof instruments>;

export const EVENT_THRESHOLD = 0.03; // ±3%

/** 이미 존재하면 skip. id 규칙: `${instrumentId}-${date}` */
async function eventExists(instrumentId: string, date: string): Promise<boolean> {
  const id = `${instrumentId}-${date}`;
  const rows = await db.select().from(marketEvents).where(eq(marketEvents.id, id));
  return rows.length > 0;
}

/** 종목 이름/심볼 기반 뉴스 쿼리 생성 */
function buildNewsQueries(inst: Instrument): string[] {
  // 한국 종목: 한글명 + 심볼. 해외: 심볼 + 영문명
  if (inst.market === "KRX" || inst.market === "KOSDAQ") {
    return [inst.name, inst.symbol];
  }
  return [inst.symbol, inst.name];
}

/** 한 이벤트 (종목+날짜) 생성: 뉴스 수집 → LLM 요약 → DB insert */
export async function processEvent(
  inst: Instrument,
  date: string,
  dayChangePct: number
): Promise<{ ok: boolean; skipped?: string; news?: number }> {
  if (Math.abs(dayChangePct) < EVENT_THRESHOLD) {
    return { ok: false, skipped: "below-threshold" };
  }
  if (await eventExists(inst.id, date)) {
    return { ok: false, skipped: "exists" };
  }

  // 뉴스 수집 (병렬)
  const ticker = yahooTickerFor(inst);
  const queries = buildNewsQueries(inst);
  const isForeign = inst.market === "NYSE" || inst.market === "NASDAQ";

  const newsTasks: Promise<NewsSnippet[]>[] = [
    fetchYahooNews(ticker, date),
    ...queries.map((q) =>
      fetchGoogleNewsRss(q, {
        lang: inst.market === "KRX" || inst.market === "KOSDAQ" ? "ko" : "en",
      })
    ),
  ];
  if (isForeign) {
    newsTasks.push(fetchRedditPosts(inst.symbol));
  }
  const allNews = (await Promise.all(newsTasks)).flat();

  // 중복 제거 (headline 기준)
  const seen = new Set<string>();
  const deduped: NewsSnippet[] = [];
  for (const n of allNews) {
    const key = n.headline.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(n);
  }

  if (deduped.length === 0) {
    return { ok: false, skipped: "no-news" };
  }

  // LLM 요약
  const summary = await summarizeEvent({
    instrumentName: inst.name,
    symbol: inst.symbol,
    date,
    dayChangePct,
    news: deduped.slice(0, 8),
  });

  if (!summary) {
    return { ok: false, skipped: "summarize-failed" };
  }

  // DB insert (trx 없이 순차)
  const eventId = `${inst.id}-${date}`;
  await db.insert(marketEvents).values({
    id: eventId,
    instrumentId: inst.id,
    date,
    dayChangePct,
    summary: summary.summary,
  });
  for (let i = 0; i < summary.news.length; i++) {
    const n = summary.news[i];
    await db.insert(newsItems).values({
      eventId,
      headline: n.headline,
      source: n.source,
      category: n.category,
      impact: n.impact,
      url: n.url,
      sortOrder: i,
    });
  }

  return { ok: true, news: summary.news.length };
}
