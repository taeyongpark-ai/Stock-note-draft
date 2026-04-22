"use server";

import { db } from "@/db/client";
import { trades, reviews, instruments, cashBalances, fxTransactions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type Currency = "KRW" | "USD" | "USDT";
type Market = "KRX" | "KOSDAQ" | "NASDAQ" | "NYSE" | "CRYPTO";

/** 초기 포지션 이관 매매는 현금 잔고 재계산에서 제외 — 이미 기입된 잔고에 반영됨 */
function isInitialTransfer(tags: string[]): boolean {
  return tags.includes("초기이관");
}

/** cash_balances upsert helper (양수=증가, 음수=감소) */
async function applyCashDelta(currency: Currency, delta: number) {
  await db
    .insert(cashBalances)
    .values({ currency, amount: delta })
    .onConflictDoUpdate({
      target: cashBalances.currency,
      set: { amount: sql`${cashBalances.amount} + ${delta}` },
    });
}

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

  // 현금 잔고 자동 반영 (초기이관은 제외)
  if (!isInitialTransfer(data.tags)) {
    const inst = (
      await db.select().from(instruments).where(eq(instruments.id, instrumentId))
    )[0];
    if (inst) {
      const amount = data.quantity * data.price;
      const delta = data.side === "BUY" ? -amount : amount;
      await applyCashDelta(inst.currency as Currency, delta);
    }
  }

  revalidatePath("/trades");
  revalidatePath("/portfolio");
  revalidatePath("/");
  redirect(`/trades/${id}`);
}

/** 증권사 계좌 입금/출금 (은행 ↔ 증권사). 원화 잔고 직접 증감. */
export async function recordCashMovement(data: {
  direction: "IN" | "OUT";
  currency: Currency;
  amount: number;
  memo?: string;
  executedAt?: string;
}) {
  const delta = data.direction === "IN" ? data.amount : -data.amount;
  await applyCashDelta(data.currency, delta);
  revalidatePath("/portfolio");
  revalidatePath("/");
}

/**
 * 현 cash_balances + (초기이관 제외) 모든 trades로 재계산해 cash_balances를 리셋.
 * 기준점: 초기이관 시점의 cash_balances (28,387,361원 / 0 USD).
 *
 * 주의: 현재는 소급 적용할 non-초기이관 trade가 없지만, 이후 수동/자동 등록이 쌓이면
 * 이 action을 호출해 cash를 재계산 가능.
 */
export async function recomputeCashFromTrades(baseline: {
  krw: number;
  usd: number;
  usdt?: number;
}) {
  const allTrades = await db
    .select({ trade: trades, instrument: instruments })
    .from(trades)
    .innerJoin(instruments, eq(trades.instrumentId, instruments.id));

  const balance: Record<Currency, number> = {
    KRW: baseline.krw,
    USD: baseline.usd,
    USDT: baseline.usdt ?? 0,
  };

  for (const { trade: t, instrument: inst } of allTrades) {
    if (isInitialTransfer((t.tags as string[]) ?? [])) continue;
    const amount = t.quantity * t.price;
    const delta = t.side === "BUY" ? -amount : amount;
    balance[inst.currency as Currency] += delta;
  }

  for (const currency of ["KRW", "USD", "USDT"] as Currency[]) {
    await db
      .insert(cashBalances)
      .values({ currency, amount: balance[currency] })
      .onConflictDoUpdate({
        target: cashBalances.currency,
        set: { amount: balance[currency] },
      });
  }

  revalidatePath("/portfolio");
  revalidatePath("/");
  return balance;
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
