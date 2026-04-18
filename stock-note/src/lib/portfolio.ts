/**
 * FIFO 기반 포지션 계산. DB에서 읽은 trades + instruments를 받아 현재 보유분만 계산.
 * - KRW 평단가/평가금액은 매수 시점의 fxToKrw를 로트별로 보관해 가중 평균
 * - 현재 환율(currentFx)은 평가금액 KRW 환산에만 사용
 */

import type { InferSelectModel } from "drizzle-orm";
import type { instruments, trades } from "@/db/schema";

export type DbInstrument = InferSelectModel<typeof instruments>;
export type DbTrade = InferSelectModel<typeof trades>;

export type Position = {
  instrument: DbInstrument;
  quantity: number;
  /** 거래통화 기준 평단가 */
  avgCost: number;
  /** 거래통화 기준 평가금액 */
  marketValue: number;
  /** 거래통화 기준 평가손익 */
  unrealized: number;
  unrealizedPct: number;
  /** 원화 환산 평단가 (체결 시점 환율 가중 평균). KRW 종목이면 avgCost와 동일 */
  krwAvgCost: number;
  /** 원화 환산 평가금액 (현재 FX). KRW 종목이면 marketValue와 동일 */
  krwMarketValue: number;
  krwUnrealized: number;
  krwUnrealizedPct: number;
};

export function computePositions(
  trades: DbTrade[],
  instrumentMap: Map<string, DbInstrument>,
  currentFx: number
): Position[] {
  const byInst = new Map<string, DbTrade[]>();
  for (const t of trades) {
    const arr = byInst.get(t.instrumentId) ?? [];
    arr.push(t);
    byInst.set(t.instrumentId, arr);
  }
  const positions: Position[] = [];
  for (const [iid, list] of byInst) {
    const instrument = instrumentMap.get(iid);
    if (!instrument) continue;
    const sorted = [...list].sort((a, b) => a.executedAt.localeCompare(b.executedAt));
    const lots: { qty: number; price: number; fx: number }[] = [];
    for (const t of sorted) {
      if (t.side === "BUY") {
        const fx = instrument.currency === "KRW" ? 1 : (t.fxToKrw ?? currentFx);
        lots.push({ qty: t.quantity, price: t.price, fx });
      } else {
        let remaining = t.quantity;
        while (remaining > 0 && lots.length) {
          const head = lots[0];
          const take = Math.min(head.qty, remaining);
          head.qty -= take;
          remaining -= take;
          if (head.qty <= 0) lots.shift();
        }
      }
    }
    const qty = lots.reduce((s, l) => s + l.qty, 0);
    if (qty <= 0) continue;
    const cost = lots.reduce((s, l) => s + l.qty * l.price, 0);
    const avg = cost / qty;
    const marketValue = qty * instrument.currentPrice;
    const unrealized = marketValue - cost;

    const fxForMV = instrument.currency === "KRW" ? 1 : currentFx;
    const krwCost = lots.reduce((s, l) => s + l.qty * l.price * l.fx, 0);
    const krwAvgCost = krwCost / qty;
    const krwMarketValue = marketValue * fxForMV;
    const krwUnrealized = krwMarketValue - krwCost;
    const krwUnrealizedPct = krwCost > 0 ? krwUnrealized / krwCost : 0;

    positions.push({
      instrument,
      quantity: qty,
      avgCost: avg,
      marketValue,
      unrealized,
      unrealizedPct: cost > 0 ? unrealized / cost : 0,
      krwAvgCost,
      krwMarketValue,
      krwUnrealized,
      krwUnrealizedPct,
    });
  }
  positions.sort((a, b) => b.krwMarketValue - a.krwMarketValue);
  return positions;
}

export type CashRow = { currency: "KRW" | "USD" | "USDT"; amount: number };

/** 평가금액 합계 (포지션 KRW + 현금 KRW 환산). */
export function totalEquityKRW(
  positions: Position[],
  cash: CashRow[],
  currentFx: number
): { total: number; cost: number; unrealized: number; unrealizedPct: number } {
  let total = 0;
  let cost = 0;
  for (const p of positions) {
    total += p.krwMarketValue;
    cost += p.krwAvgCost * p.quantity;
  }
  for (const c of cash) {
    const fx = c.currency === "KRW" ? 1 : currentFx;
    total += c.amount * fx;
    cost += c.amount * fx; // 현금은 원가=평가
  }
  const unrealized = total - cost;
  return {
    total,
    cost,
    unrealized,
    unrealizedPct: cost > 0 ? unrealized / cost : 0,
  };
}
