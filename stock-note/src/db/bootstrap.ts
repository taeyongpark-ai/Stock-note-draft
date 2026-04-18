// 실제 운영 시작 시 1회 실행: 기존 매매/리뷰/관심/이벤트 모두 비우고
// 사용자의 현재 포지션을 "초기 이관" BUY 매매 + 현금 잔고로 심는다.
// 종목 현재가는 Phase B에서 실제 API로 대체되기 전까지 매입가로 세팅.
//
// 실행: `npm run db:bootstrap`
// ⚠️ 기존 매매/리뷰/관심/이벤트/뉴스 데이터가 모두 삭제됩니다.

import "./load-env";
import { db } from "./client";
import {
  instruments,
  trades,
  reviews,
  watchlist,
  marketEvents,
  newsItems,
  instrumentCatalysts,
  cashBalances,
  fxTransactions,
} from "./schema";

type SeedHolding = {
  id: string; // instruments PK
  symbol: string;
  name: string;
  market: "KRX" | "KOSDAQ" | "NASDAQ" | "NYSE" | "CRYPTO";
  currency: "KRW" | "USD";
  color: string;
  quantity: number;
  /** 거래통화 기준 매입가 */
  price: number;
  /** 해외만: 체결 환율 */
  fxToKrw?: number;
};

// 아래 데이터는 사용자 제공 기준.
const HOLDINGS: SeedHolding[] = [
  // 국내
  { id: "i-005380", symbol: "005380", name: "현대차", market: "KRX", currency: "KRW", color: "#002C5F", quantity: 18, price: 542000 },
  { id: "i-005930", symbol: "005930", name: "삼성전자", market: "KRX", currency: "KRW", color: "#1428A0", quantity: 164, price: 192107 },
  { id: "i-473640", symbol: "473640", name: "HANARO 글로벌금채굴기업", market: "KRX", currency: "KRW", color: "#D4A017", quantity: 1, price: 36000 },
  { id: "i-520038", symbol: "520038", name: "미래에셋 인버스 코스피200 선물 ETN", market: "KRX", currency: "KRW", color: "#E74C3C", quantity: 1, price: 4615 },
  // 해외
  { id: "i-googl", symbol: "GOOGL", name: "알파벳 Class A", market: "NASDAQ", currency: "USD", color: "#4285F4", quantity: 52, price: 304.53, fxToKrw: 1466.08 },
  { id: "i-nem", symbol: "NEM", name: "뉴몬트", market: "NYSE", currency: "USD", color: "#FDB813", quantity: 5, price: 86.55, fxToKrw: 1431.26 },
  { id: "i-nvda", symbol: "NVDA", name: "엔비디아", market: "NASDAQ", currency: "USD", color: "#76B900", quantity: 128, price: 179.50, fxToKrw: 1449.46 },
  { id: "i-ufo", symbol: "UFO", name: "프로큐어 우주 ETF", market: "NYSE", currency: "USD", color: "#8B5CF6", quantity: 323, price: 46.07, fxToKrw: 1471.16 },
  { id: "i-spy", symbol: "SPY", name: "SPDR S&P500 ETF", market: "NYSE", currency: "USD", color: "#1E40AF", quantity: 5, price: 678.63, fxToKrw: 1454.21 },
];

const CASH: { currency: "KRW" | "USD" | "USDT"; amount: number }[] = [
  { currency: "KRW", amount: 28387361 },
];

const INITIAL_EXECUTED_AT = new Date().toISOString();

async function main() {
  // 의존 순서 반대로 모두 비우기
  await db.delete(newsItems);
  await db.delete(marketEvents);
  await db.delete(instrumentCatalysts);
  await db.delete(watchlist);
  await db.delete(reviews);
  await db.delete(trades);
  await db.delete(fxTransactions);
  await db.delete(cashBalances);
  await db.delete(instruments);

  // instruments
  for (const h of HOLDINGS) {
    await db.insert(instruments).values({
      id: h.id,
      symbol: h.symbol,
      name: h.name,
      market: h.market,
      currency: h.currency,
      color: h.color,
      currentPrice: h.price, // Phase B에서 실시간으로 갱신
      dayChange: 0,
    });
  }

  // 초기 이관 BUY 매매
  for (const h of HOLDINGS) {
    await db.insert(trades).values({
      id: `t-init-${h.id}`,
      instrumentId: h.id,
      side: "BUY",
      quantity: h.quantity,
      price: h.price,
      fee: 0,
      executedAt: INITIAL_EXECUTED_AT,
      thesis: "초기 포지션 이관 (기존 보유분)",
      confidence: 3,
      tags: ["초기이관"],
      fxToKrw: h.fxToKrw,
    });
  }

  // 현금 잔고
  for (const c of CASH) {
    await db.insert(cashBalances).values(c);
  }

  console.log("bootstrap OK:", {
    instruments: HOLDINGS.length,
    trades: HOLDINGS.length,
    cash: CASH.map((c) => `${c.currency} ${c.amount.toLocaleString()}`).join(", "),
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
