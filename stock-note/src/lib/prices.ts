/**
 * Yahoo Finance 티커 변환 + 시세 fetch 유틸.
 *
 * 국내 6자리 코드는 .KS (KRX) / .KQ (KOSDAQ) 접미사가 필요.
 * 암호화폐(USDT)는 -USD 접미사.
 */

import type { InferSelectModel } from "drizzle-orm";
import type { instruments } from "@/db/schema";

type Instrument = InferSelectModel<typeof instruments>;

export function yahooTickerFor(inst: Pick<Instrument, "symbol" | "market" | "currency">): string {
  if (inst.market === "KRX") return `${inst.symbol}.KS`;
  if (inst.market === "KOSDAQ") return `${inst.symbol}.KQ`;
  if (inst.market === "CRYPTO") return `${inst.symbol}-USD`;
  return inst.symbol; // NYSE, NASDAQ
}

export type LiveQuote = {
  price: number;
  /** 전일대비 등락률 (소수, 0.02 = +2%) */
  dayChangePct: number;
};

export type HistBar = {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type YahooQuote = {
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
};

async function getYahoo() {
  const mod = await import("yahoo-finance2");
  const YahooFinance = mod.default;
  // v3: 인스턴스 필요
  return new YahooFinance();
}

/** 단일 티커 현재가 조회 */
export async function fetchQuote(ticker: string): Promise<LiveQuote | null> {
  const yahooFinance = await getYahoo();
  try {
    const q = (await yahooFinance.quote(ticker)) as YahooQuote;
    const price = q.regularMarketPrice;
    if (typeof price !== "number") return null;
    const pct = q.regularMarketChangePercent;
    return {
      price,
      dayChangePct: typeof pct === "number" ? pct / 100 : 0,
    };
  } catch (e) {
    console.error(`[fetchQuote] ${ticker}:`, e);
    return null;
  }
}

type YahooChartResult = {
  quotes?: Array<{
    date: Date;
    open?: number | null;
    high?: number | null;
    low?: number | null;
    close?: number | null;
    volume?: number | null;
  }>;
};

/** 과거 일봉 (period1 ~ 오늘) */
export async function fetchDailyHistory(
  ticker: string,
  fromDate: Date
): Promise<HistBar[]> {
  const yahooFinance = await getYahoo();
  try {
    const rows = (await yahooFinance.chart(ticker, {
      period1: fromDate,
      interval: "1d",
    })) as YahooChartResult;
    const quotes = rows?.quotes ?? [];
    return quotes
      .filter((r) => r.close != null && r.open != null)
      .map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        open: r.open as number,
        high: (r.high ?? r.close) as number,
        low: (r.low ?? r.close) as number,
        close: r.close as number,
        volume: r.volume ?? undefined,
      }));
  } catch (e) {
    console.error(`[fetchDailyHistory] ${ticker}:`, e);
    return [];
  }
}
