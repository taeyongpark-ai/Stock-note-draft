// 미리보기용 목 데이터. DB 연결 전까지만 사용.

export type Market = "KRX" | "KOSDAQ" | "NASDAQ" | "NYSE" | "CRYPTO";
export type Side = "BUY" | "SELL";
export type Verdict = "GOOD" | "NEUTRAL" | "BAD";

export type Instrument = {
  id: string;
  symbol: string;
  name: string;
  market: Market;
  currency: "KRW" | "USD" | "USDT";
  /** 원형 아이콘용 배경색 */
  color: string;
  /** 현재가 (15분 지연) */
  currentPrice: number;
  /** 전일 종가 대비 등락률 */
  dayChange: number;
};

export type Trade = {
  id: string;
  instrumentId: string;
  side: Side;
  quantity: number;
  /** 거래 체결가 (거래통화) */
  price: number;
  fee: number;
  executedAt: string; // ISO
  thesis: string;
  confidence: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  review?: Review;
};

export type Review = {
  reviewedAt: string;
  verdict: Verdict;
  reflection: string;
  counterfactualPrice?: number;
  counterfactualAt?: string;
};

export const INSTRUMENTS: Instrument[] = [
  { id: "i-samsung", symbol: "005930", name: "삼성전자", market: "KRX", currency: "KRW", color: "#1428A0", currentPrice: 218_000, dayChange: 0.0023 },
  { id: "i-hyundai", symbol: "005380", name: "현대차", market: "KRX", currency: "KRW", color: "#002C5F", currentPrice: 539_000, dayChange: -0.0055 },
  { id: "i-naver",   symbol: "035420", name: "네이버",  market: "KRX", currency: "KRW", color: "#03C75A", currentPrice: 212_500, dayChange: 0.0142 },
  { id: "i-aapl",    symbol: "AAPL",   name: "애플",    market: "NASDAQ", currency: "USD", color: "#111", currentPrice: 234.12, dayChange: 0.0081 },
  { id: "i-nvda",    symbol: "NVDA",   name: "엔비디아", market: "NASDAQ", currency: "USD", color: "#76B900", currentPrice: 296.42, dayChange: 0.0137 },
  { id: "i-googl",   symbol: "GOOGL",  name: "알파벳",   market: "NASDAQ", currency: "USD", color: "#E74133", currentPrice: 385.60, dayChange: 0.0122 },
  { id: "i-btc",     symbol: "BTC",    name: "비트코인", market: "CRYPTO", currency: "USDT", color: "#F7931A", currentPrice: 102_300, dayChange: -0.0215 },
];

export const TRADES: Trade[] = [
  {
    id: "t-001",
    instrumentId: "i-samsung",
    side: "BUY",
    quantity: 164,
    price: 192_200,
    fee: 3200,
    executedAt: "2026-01-12T09:12:00+09:00",
    thesis:
      "메모리 사이클 바닥 판단. DDR5 가격 반등 신호, HBM 매출 비중 30% 넘는 분기 확인. 연말까지 홀드.",
    confidence: 4,
    tags: ["반도체", "장기", "턴어라운드"],
  },
  {
    id: "t-002",
    instrumentId: "i-nvda",
    side: "BUY",
    quantity: 128,
    price: 260.55,
    fee: 0,
    executedAt: "2026-02-04T22:40:00+09:00",
    thesis:
      "Blackwell 생산 램프업, AI capex 피크 아님. 10% 조정에서 진입. 손절선 235.",
    confidence: 5,
    tags: ["AI", "장기"],
  },
  {
    id: "t-003",
    instrumentId: "i-googl",
    side: "BUY",
    quantity: 52,
    price: 343.55,
    fee: 0,
    executedAt: "2026-02-11T23:05:00+09:00",
    thesis:
      "검색 광고 회복 + Waymo 라이드 수 가속. Gemini 3 출시 모멘텀. PER 22배로 저평가.",
    confidence: 4,
    tags: ["AI", "광고"],
  },
  {
    id: "t-004",
    instrumentId: "i-hyundai",
    side: "BUY",
    quantity: 18,
    price: 542_000,
    fee: 1500,
    executedAt: "2026-03-03T10:20:00+09:00",
    thesis:
      "주주환원 확대 발표 + 미국 IRA 수혜 지속. 배당수익률 5%대. 밸류업 테마.",
    confidence: 3,
    tags: ["밸류업", "배당"],
  },
  {
    id: "t-005",
    instrumentId: "i-btc",
    side: "SELL",
    quantity: 0.6,
    price: 118_200,
    fee: 30,
    executedAt: "2026-03-20T11:45:00+09:00",
    thesis:
      "단기 급등 후 RSI 과열. 절반 차익 실현, 나머지는 홀드.",
    confidence: 3,
    tags: ["크립토", "차익"],
    review: {
      reviewedAt: "2026-04-10T09:00:00+09:00",
      verdict: "BAD",
      reflection:
        "매도 후 오히려 내려갔다가 다시 상승. 절반 매도 원칙은 지켰지만, 감정적 과열 판단이었음. 기술적 근거 부족.",
      counterfactualPrice: 126_800,
      counterfactualAt: "2026-04-01T00:00:00+09:00",
    },
  },
  {
    id: "t-006",
    instrumentId: "i-naver",
    side: "BUY",
    quantity: 22,
    price: 186_400,
    fee: 400,
    executedAt: "2026-01-28T09:40:00+09:00",
    thesis:
      "클로바 B2B 계약 증가, 커머스 광고 회복. PER 18배 하단.",
    confidence: 3,
    tags: ["AI", "광고"],
  },
  {
    id: "t-007",
    instrumentId: "i-aapl",
    side: "SELL",
    quantity: 12,
    price: 228.10,
    fee: 0,
    executedAt: "2026-04-02T22:30:00+09:00",
    thesis:
      "실적 서프라이즈 없음. AI 내러티브 약화. 일부 정리 후 엔비디아로 비중 이동.",
    confidence: 2,
    tags: ["리밸런싱"],
  },
];

// 대략 1340원대 USD/KRW 가정 (목 데이터)
export const USD_KRW = 1380;

export function inst(id: string): Instrument {
  const x = INSTRUMENTS.find((i) => i.id === id);
  if (!x) throw new Error("instrument not found: " + id);
  return x;
}

/** KRW 기준 금액으로 환산 */
export function toKRW(amount: number, currency: string): number {
  if (currency === "KRW") return amount;
  if (currency === "USD") return amount * USD_KRW;
  if (currency === "USDT") return amount * USD_KRW;
  return amount;
}

/** FIFO 원가 기준 포지션 요약 (현재 보유분만) */
export type Position = {
  instrument: Instrument;
  quantity: number;
  avgCost: number;
  marketValue: number; // 거래통화 기준
  unrealized: number;
  unrealizedPct: number;
};

export function computePositions(trades: Trade[] = TRADES): Position[] {
  const byInst = new Map<string, Trade[]>();
  for (const t of trades) {
    const arr = byInst.get(t.instrumentId) ?? [];
    arr.push(t);
    byInst.set(t.instrumentId, arr);
  }
  const positions: Position[] = [];
  for (const [iid, list] of byInst) {
    const sorted = [...list].sort((a, b) => a.executedAt.localeCompare(b.executedAt));
    const lots: { qty: number; price: number }[] = [];
    for (const t of sorted) {
      if (t.side === "BUY") lots.push({ qty: t.quantity, price: t.price });
      else {
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
    const instrument = inst(iid);
    const marketValue = qty * instrument.currentPrice;
    const unrealized = marketValue - cost;
    positions.push({
      instrument,
      quantity: qty,
      avgCost: avg,
      marketValue,
      unrealized,
      unrealizedPct: unrealized / cost,
    });
  }
  // 평가금액 KRW 환산 순 정렬
  positions.sort(
    (a, b) =>
      toKRW(b.marketValue, b.instrument.currency) -
      toKRW(a.marketValue, a.instrument.currency)
  );
  return positions;
}

export function totalPortfolioKRW(positions: Position[]): {
  total: number;
  cost: number;
  unrealized: number;
  unrealizedPct: number;
} {
  let total = 0, cost = 0;
  for (const p of positions) {
    total += toKRW(p.marketValue, p.instrument.currency);
    cost += toKRW(p.avgCost * p.quantity, p.instrument.currency);
  }
  const unrealized = total - cost;
  return {
    total,
    cost,
    unrealized,
    unrealizedPct: cost > 0 ? unrealized / cost : 0,
  };
}

/** "복기 대기" = 매도 후 7일 경과했고 리뷰가 없는 거래 */
export function pendingReviews(trades: Trade[] = TRADES, now = new Date()): Trade[] {
  return trades.filter(
    (t) =>
      t.side === "SELL" &&
      !t.review &&
      (now.getTime() - new Date(t.executedAt).getTime()) / 86400000 >= 7
  );
}

export function getTrade(id: string): Trade | undefined {
  return TRADES.find((t) => t.id === id);
}

/** 종목별 매매 그룹 */
export function tradesByInstrument(trades: Trade[] = TRADES) {
  const map = new Map<string, Trade[]>();
  for (const t of trades) {
    const arr = map.get(t.instrumentId) ?? [];
    arr.push(t);
    map.set(t.instrumentId, arr);
  }
  return [...map.entries()].map(([iid, list]) => ({
    instrument: inst(iid),
    trades: list.sort((a, b) => b.executedAt.localeCompare(a.executedAt)),
  }));
}

/** 지수 미니 스파크라인 목 데이터 */
export type IndexSnap = {
  name: string;
  value: number;
  change: number; // 비율
  points: number[];
  flag?: string;
};

export const INDEX_SNAPSHOTS: IndexSnap[] = [
  {
    name: "KOSPI",
    value: 6191.92,
    change: -0.0055,
    flag: "🇰🇷",
    points: [6210, 6218, 6205, 6195, 6188, 6199, 6201, 6185, 6191, 6180, 6192, 6191],
  },
  {
    name: "KOSDAQ",
    value: 1170.04,
    change: 0.0061,
    flag: "🇰🇷",
    points: [1158, 1160, 1162, 1164, 1168, 1171, 1170, 1167, 1169, 1172, 1170, 1170],
  },
  {
    name: "S&P 500",
    value: 4935.22,
    change: 0.0081,
    flag: "🇺🇸",
    points: [4890, 4895, 4900, 4908, 4912, 4920, 4918, 4925, 4930, 4928, 4932, 4935],
  },
  {
    name: "USD/KRW",
    value: 1380.2,
    change: -0.0012,
    flag: "💱",
    points: [1386, 1385, 1384, 1383, 1382, 1383, 1381, 1382, 1380, 1381, 1380, 1380],
  },
];
