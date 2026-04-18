"use server";

import { db } from "@/db/client";
import { trades, reviews, instruments, cashBalances, fxTransactions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type Currency = "KRW" | "USD" | "USDT";
type Market = "KRX" | "KOSDAQ" | "NASDAQ" | "NYSE" | "CRYPTO";

export async function createTrade(data: {
  instrumentId?: string; // 기존 종목이면 설정
  // 신규 종목이면 아래 필드로 자동 등록
  newInstrument?: {
    symbol: string;
    name: string;
    market: Market;
    currency: Currency;
    color?: string;
    currentPrice?: number;
  };
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  executedAt: string;
  thesis: string;
  confidence: number;
  tags: string[];
  fxToKrw?: number;
}) {
  let instrumentId = data.instrumentId;

  // 신규 종목 auto-insert
  if (!instrumentId && data.newInstrument) {
    const ni = data.newInstrument;
    const id = `i-${ni.symbol.toLowerCase()}`;
    await db
      .insert(instruments)
      .values({
        id,
        symbol: ni.symbol,
        name: ni.name,
        market: ni.market,
        currency: ni.currency,
        color: ni.color ?? "#94A3B8",
        currentPrice: ni.currentPrice ?? data.price,
        dayChange: 0,
      })
      .onConflictDoNothing();
    instrumentId = id;
  }

  if (!instrumentId) {
    throw new Error("instrumentId or newInstrument required");
  }

  const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  await db.insert(trades).values({
    id,
    instrumentId,
    side: data.side,
    quantity: data.quantity,
    price: data.price,
    fee: 0,
    executedAt: data.executedAt,
    thesis: data.thesis,
    confidence: data.confidence,
    tags: data.tags,
    fxToKrw: data.fxToKrw,
  });
  revalidatePath("/trades");
  revalidatePath("/portfolio");
  revalidatePath("/");
  redirect(`/trades/${id}`);
}

export async function addReview(
  tradeId: string,
  data: {
    verdict: "GOOD" | "NEUTRAL" | "BAD";
    reflection: string;
    counterfactualPrice?: number;
    counterfactualAt?: string;
  }
) {
  await db
    .insert(reviews)
    .values({ tradeId, reviewedAt: new Date().toISOString(), ...data })
    .onConflictDoUpdate({
      target: reviews.tradeId,
      set: { reviewedAt: new Date().toISOString(), ...data },
    });
  revalidatePath(`/trades/${tradeId}`);
  revalidatePath("/trades");
}

/** 환전 기록 + cash_balances 업데이트 (트랜잭션적) */
export async function createFxTransaction(data: {
  fromCurrency: Currency;
  fromAmount: number;
  toCurrency: Currency;
  toAmount: number;
  rate: number;
  executedAt: string;
  memo?: string;
}) {
  const id = `fx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  await db.insert(fxTransactions).values({ id, ...data });
  // from 감소, to 증가 (upsert)
  await db
    .insert(cashBalances)
    .values({ currency: data.fromCurrency, amount: -data.fromAmount })
    .onConflictDoUpdate({
      target: cashBalances.currency,
      set: { amount: sql`${cashBalances.amount} - ${data.fromAmount}` },
    });
  await db
    .insert(cashBalances)
    .values({ currency: data.toCurrency, amount: data.toAmount })
    .onConflictDoUpdate({
      target: cashBalances.currency,
      set: { amount: sql`${cashBalances.amount} + ${data.toAmount}` },
    });
  revalidatePath("/portfolio");
}

/** 현금 잔고 직접 설정 (관리용) */
export async function setCashBalance(currency: Currency, amount: number) {
  await db
    .insert(cashBalances)
    .values({ currency, amount })
    .onConflictDoUpdate({
      target: cashBalances.currency,
      set: { amount },
    });
  revalidatePath("/portfolio");
}
