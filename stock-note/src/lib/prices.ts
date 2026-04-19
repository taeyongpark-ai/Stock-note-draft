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

export type SearchHit = {
  /** 앱 내부 표기용 심볼 (KR은 6자리, US는 원래 심볼) */
  symbol: string;
  /** Yahoo 풀 티커 (005930.KS, NVDA 등) */
  yahooTicker: string;
  name: string;
  exchange: string;
  market: "KRX" | "KOSDAQ" | "NASDAQ" | "NYSE" | "CRYPTO";
  currency: "KRW" | "USD" | "USDT";
  quoteType: string;
};

type YahooSearchResult = {
  quotes?: Array<{
    symbol?: string;
    shortname?: string;
    longname?: string;
    exchange?: string;
    quoteType?: string;
    exchDisp?: string;
  }>;
};

function classifyExchange(exchange: string): {
  market: SearchHit["market"] | null;
  currency: SearchHit["currency"];
} {
  const ex = exchange.toUpperCase();
  if (ex === "KSC") return { market: "KRX", currency: "KRW" };
  if (ex === "KOE") return { market: "KOSDAQ", currency: "KRW" };
  if (ex === "NMS" || ex === "NGM" || ex === "NAS") return { market: "NASDAQ", currency: "USD" };
  if (ex === "NYQ" || ex === "PCX" || ex === "ASE" || ex === "BATS") return { market: "NYSE", currency: "USD" };
  if (ex === "CCC") return { market: "CRYPTO", currency: "USDT" };
  return { market: null, currency: "USD" };
}

/** Yahoo 종목 검색 (이름/티커). ETF와 주식만 반환. */
export async function searchTickers(query: string): Promise<SearchHit[]> {
  const yahooFinance = await getYahoo();
  try {
    const res = (await yahooFinance.search(query, { quotesCount: 10 })) as YahooSearchResult;
    const quotes = res?.quotes ?? [];
    const hits: SearchHit[] = [];
    for (const q of quotes) {
      if (!q.symbol) continue;
      const type = q.quoteType ?? "";
      if (type !== "EQUITY" && type !== "ETF" && type !== "CRYPTOCURRENCY") continue;
      const { market, currency } = classifyExchange(q.exchange ?? "");
      if (!market) continue;
      // KR은 Yahoo가 .KS/.KQ 붙여서 반환, 앱 내부는 6자리만 저장
      const symbol =
        market === "KRX" || market === "KOSDAQ"
          ? q.symbol.replace(/\.(KS|KQ)$/, "")
          : market === "CRYPTO"
          ? q.symbol.replace(/-USD$/, "")
          : q.symbol;
      hits.push({
        symbol,
        yahooTicker: q.symbol,
        name: q.longname ?? q.shortname ?? q.symbol,
        exchange: q.exchDisp ?? q.exchange ?? "",
        market,
        currency,
        quoteType: type,
      });
    }
    return hits;
  } catch (e) {
    console.error(`[searchTickers] ${query}:`, e);
    return [];
  }
}
