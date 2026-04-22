import { db } from "./client";
import {
  instruments,
  watchlist,
  trades,
  reviews,
  cashBalances,
  fxTransactions,
  priceHistory,
  fxRates,
  marketIndices,
  marketEvents,
  newsItems,
  instrumentCatalysts,
  llmUsage,
} from "./schema";
import { eq, desc, and, isNull, sql, gte, lte, inArray, like } from "drizzle-orm";
import { computePositions, totalEquityKRW } from "@/lib/portfolio";

/** fx_rates 없을 때 fallback */
const FALLBACK_USD_KRW = 1450;

/** 현재 원/달러 환율 (fx_rates 테이블에서 읽음, 없으면 fallback) */
export async function getCurrentUsdKrw(): Promise<number> {
  const rows = await db.select().from(fxRates).where(eq(fxRates.pair, "USD_KRW"));
  return rows[0]?.rate ?? FALLBACK_USD_KRW;
}

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

/** 포트폴리오 (현재 보유 포지션 + 총평가 + 현재 환율) 계산 */
export async function getPortfolio() {
  const [allTrades, allInstruments, cash, usdKrw] = await Promise.all([
    db.select().from(trades),
    db.select().from(instruments),
    db.select().from(cashBalances),
    getCurrentUsdKrw(),
  ]);
  const instMap = new Map(allInstruments.map((i) => [i.id, i]));
  const positions = computePositions(allTrades, instMap, usdKrw);
  const summary = totalEquityKRW(positions, cash, usdKrw);
  return { positions, cash, summary, usdKrw };
}

/** 특정 종목의 이벤트 (뉴스 포함, 최신순) */
export async function getMarketEventsByInstrumentId(instrumentId: string) {
  const events = await db
    .select()
    .from(marketEvents)
    .where(eq(marketEvents.instrumentId, instrumentId))
    .orderBy(desc(marketEvents.date));
  if (events.length === 0) return [];
  const news = await db
    .select()
    .from(newsItems)
    .where(
      inArray(
        newsItems.eventId,
        events.map((e) => e.id)
      )
    )
    .orderBy(newsItems.sortOrder);
  return events.map((e) => ({
    ...e,
    news: news.filter((n) => n.eventId === e.id),
  }));
}

/** 특정 종목의 호재/악재 */
export async function getInstrumentCatalyst(instrumentId: string) {
  const rows = await db
    .select()
    .from(instrumentCatalysts)
    .where(eq(instrumentCatalysts.instrumentId, instrumentId));
  return rows[0] ?? null;
}

/** 이번 달 LLM 사용량 합계 (KST 월초 ~ 오늘) */
export async function getMonthlyLlmUsage() {
  const now = new Date(Date.now() + 9 * 3600_000);
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const monthPrefix = `${year}-${month}-`;
  const rows = await db
    .select()
    .from(llmUsage)
    .where(like(llmUsage.date, `${monthPrefix}%`));
  const totalCost = rows.reduce((s, r) => s + r.costUsd, 0);
  const totalCalls = rows.reduce((s, r) => s + r.calls, 0);
  const todayRow = rows.find((r) => r.date === now.toISOString().slice(0, 10));
  return {
    monthTotalUsd: totalCost,
    monthCalls: totalCalls,
    todayUsd: todayRow?.costUsd ?? 0,
    todayCalls: todayRow?.calls ?? 0,
  };
}

/** 시장 지수 (홈 헤더용) */
export async function getMarketIndices() {
  return db.select().from(marketIndices).orderBy(marketIndices.sortOrder);
}

/** 특정 종목의 일봉 시계열 (date 오름차순) */
export async function getPriceHistory(
  instrumentId: string,
  fromDate: string,
  toDate: string
) {
  return db
    .select()
    .from(priceHistory)
    .where(
      and(
        eq(priceHistory.instrumentId, instrumentId),
        gte(priceHistory.date, fromDate),
        lte(priceHistory.date, toDate)
      )
    )
    .orderBy(priceHistory.date);
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
