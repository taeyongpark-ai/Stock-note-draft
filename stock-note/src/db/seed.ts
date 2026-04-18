// 로컬 SQLite 시드 스크립트.
// 실행: `npm run db:seed`
// 기존 데이터를 모두 비우고 mock.ts 내용을 다시 채운다.
// DATABASE_URL 미지정 시 client.ts가 `file:./local.db`로 fallback 하므로 로컬에서는 env 없어도 됨.

import { db } from "./client";
import {
  instruments,
  trades,
  reviews,
  watchlist,
  marketEvents,
  newsItems,
  instrumentCatalysts,
} from "./schema";
import {
  INSTRUMENTS,
  TRADES,
  MARKET_EVENTS,
  INSTRUMENT_CATALYSTS,
} from "../lib/mock";

// mock.ts의 WATCHLIST가 제거되기 전까지 사용. 제거되면 여기서만 하드코딩해서 seed.
const SEED_WATCHLIST = ["i-tsla", "i-tqqq", "i-uso", "i-hae"];

async function main() {
  // 의존 순서 반대로 비우기
  await db.delete(newsItems);
  await db.delete(marketEvents);
  await db.delete(instrumentCatalysts);
  await db.delete(watchlist);
  await db.delete(reviews);
  await db.delete(trades);
  await db.delete(instruments);

  // instruments
  await db.insert(instruments).values(INSTRUMENTS);

  // trades + reviews
  for (const t of TRADES) {
    await db.insert(trades).values({
      id: t.id,
      instrumentId: t.instrumentId,
      side: t.side,
      quantity: t.quantity,
      price: t.price,
      fee: t.fee,
      executedAt: t.executedAt,
      thesis: t.thesis,
      confidence: t.confidence,
      tags: t.tags,
      fxToKrw: t.fxToKRW ?? null,
    });
    if (t.review) {
      await db.insert(reviews).values({
        tradeId: t.id,
        reviewedAt: t.review.reviewedAt,
        verdict: t.review.verdict,
        reflection: t.review.reflection,
        counterfactualPrice: t.review.counterfactualPrice ?? null,
        counterfactualAt: t.review.counterfactualAt ?? null,
      });
    }
  }

  // watchlist
  for (const id of SEED_WATCHLIST) {
    await db.insert(watchlist).values({
      instrumentId: id,
      addedAt: new Date().toISOString(),
    });
  }

  // market_events + news_items
  for (const e of MARKET_EVENTS) {
    const eventId = `${e.instrumentId}-${e.date}`;
    await db.insert(marketEvents).values({
      id: eventId,
      instrumentId: e.instrumentId,
      date: e.date,
      dayChangePct: e.dayChangePct,
      summary: e.summary,
    });
    for (let i = 0; i < e.news.length; i++) {
      const n = e.news[i];
      await db.insert(newsItems).values({
        eventId,
        headline: n.headline,
        source: n.source,
        category: n.category,
        impact: n.impact,
        url: n.url ?? null,
        sortOrder: i,
      });
    }
  }

  // instrument_catalysts
  for (const c of INSTRUMENT_CATALYSTS) {
    await db.insert(instrumentCatalysts).values(c);
  }

  const counts = {
    instruments: (await db.select().from(instruments)).length,
    trades: (await db.select().from(trades)).length,
    reviews: (await db.select().from(reviews)).length,
    watchlist: (await db.select().from(watchlist)).length,
    marketEvents: (await db.select().from(marketEvents)).length,
    newsItems: (await db.select().from(newsItems)).length,
    instrumentCatalysts: (await db.select().from(instrumentCatalysts)).length,
  };
  console.log("seed OK:", counts);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
