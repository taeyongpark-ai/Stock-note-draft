import { db } from "./client";
import {
  instruments,
  watchlist,
  trades,
  reviews,
  cashBalances,
  fxTransactions,
} from "./schema";
import { eq, desc, and, isNull, sql } from "drizzle-orm";
import { computePositions, totalEquityKRW } from "@/lib/portfolio";

// 현재 원/달러 환율: Phase B에서 외부 API로 대체 예정. 지금은 상수.
export const CURRENT_USD_KRW = 1450;

/** 전체 종목 목록 (관심 추가 모달 검색용) */
export async function getAllInstruments() {
  return db.select().from(instruments);
}

/** 단일 종목 */
export async function getInstrumentById(id: string) {
  const rows = await db.select().from(instruments).where(eq(instruments.id, id));
  return rows[0] ?? null;
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

/** 최근 매매 N건 (홈용) */
export async function getRecentTrades(limit: number) {
  const rows = await db
    .select({ trade: trades, instrument: instruments })
    .from(trades)
    .innerJoin(instruments, eq(trades.instrumentId, instruments.id))
    .orderBy(desc(trades.executedAt))
    .limit(limit);
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

/** 현금 잔고 전체 */
export async function getCashBalances() {
  return db.select().from(cashBalances);
}

/** 환전 이력 */
export async function getFxTransactions() {
  return db.select().from(fxTransactions).orderBy(desc(fxTransactions.executedAt));
}

/** 포트폴리오 (현재 보유 포지션 + 총평가) 계산 */
export async function getPortfolio() {
  const [allTrades, allInstruments, cash] = await Promise.all([
    db.select().from(trades),
    db.select().from(instruments),
    db.select().from(cashBalances),
  ]);
  const instMap = new Map(allInstruments.map((i) => [i.id, i]));
  const positions = computePositions(allTrades, instMap, CURRENT_USD_KRW);
  const summary = totalEquityKRW(positions, cash, CURRENT_USD_KRW);
  return { positions, cash, summary };
}

/** 복기 대기 (매도 후 7일 경과 + review 없음) */
export async function getPendingReviewTrades(nowDate: Date, days = 7) {
  const cutoff = new Date(nowDate.getTime() - days * 86400000).toISOString();
  const rows = await db
    .select({ trade: trades, instrument: instruments })
    .from(trades)
    .leftJoin(reviews, eq(reviews.tradeId, trades.id))
    .innerJoin(instruments, eq(trades.instrumentId, instruments.id))
    .where(
      and(
        eq(trades.side, "SELL"),
        isNull(reviews.tradeId),
        sql`${trades.executedAt} <= ${cutoff}`
      )
    )
    .orderBy(desc(trades.executedAt));
  return rows;
}
