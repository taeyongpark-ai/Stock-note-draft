import { db } from "./client";
import { instruments, watchlist, trades, reviews } from "./schema";
import { eq, desc } from "drizzle-orm";

/** 전체 종목 목록 (관심 추가 모달 검색용) */
export async function getAllInstruments() {
  return db.select().from(instruments);
}

/** 관심 종목에 등록된 instrument 객체 배열 */
export async function getWatchlistInstruments() {
  const rows = await db
    .select({ instrument: instruments })
    .from(watchlist)
    .innerJoin(instruments, eq(watchlist.instrumentId, instruments.id));
  return rows.map((r) => r.instrument);
}

/** 전체 매매 목록 (instrument + review 포함, 최신순) */
export async function getAllTrades() {
  const rows = await db
    .select({ trade: trades, instrument: instruments, review: reviews })
    .from(trades)
    .innerJoin(instruments, eq(trades.instrumentId, instruments.id))
    .leftJoin(reviews, eq(reviews.tradeId, trades.id))
    .orderBy(desc(trades.executedAt));
  return rows;
}

/** 단일 매매 (instrument + review 포함) */
export async function getTradeById(id: string) {
  const rows = await db
    .select({ trade: trades, instrument: instruments, review: reviews })
    .from(trades)
    .innerJoin(instruments, eq(trades.instrumentId, instruments.id))
    .leftJoin(reviews, eq(reviews.tradeId, trades.id))
    .where(eq(trades.id, id));
  return rows[0] ?? null;
}

/** 특정 종목의 전체 매매 이력 (오래된 순) */
export async function getTradesByInstrumentId(instrumentId: string) {
  const rows = await db
    .select({ trade: trades, instrument: instruments, review: reviews })
    .from(trades)
    .innerJoin(instruments, eq(trades.instrumentId, instruments.id))
    .leftJoin(reviews, eq(reviews.tradeId, trades.id))
    .where(eq(trades.instrumentId, instrumentId))
    .orderBy(trades.executedAt);
  return rows;
}
