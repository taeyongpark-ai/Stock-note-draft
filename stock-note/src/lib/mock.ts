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
  /** 체결 시점 1 (해당통화) → KRW 환율. currency === "KRW"면 생략 */
  fxToKRW?: number;
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
  // 관심 종목 (미보유) — 동향 탭 전용
  { id: "i-tsla",    symbol: "TSLA",   name: "테슬라",    market: "NASDAQ", currency: "USD", color: "#CC0000", currentPrice: 412.80, dayChange: -0.0218 },
  { id: "i-tqqq",    symbol: "TQQQ",   name: "TQQQ",     market: "NASDAQ", currency: "USD", color: "#2563EB", currentPrice: 112.45, dayChange: 0.0341 },
  { id: "i-uso",     symbol: "USO",    name: "USO 원유ETF", market: "NYSE", currency: "USD", color: "#0F172A", currentPrice: 84.60, dayChange: 0.0088 },
  { id: "i-hae",     symbol: "012450", name: "한화에어로스페이스", market: "KRX", currency: "KRW", color: "#EA580C", currentPrice: 412_500, dayChange: 0.0067 },
];

// 관심 종목은 이제 DB(watchlist 테이블)에서 읽는다. src/db/queries.ts 참고.

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
    fxToKRW: 1385,
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
    fxToKRW: 1382,
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
    fxToKRW: 1378,
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
    fxToKRW: 1376,
  },
  {
    id: "t-008",
    instrumentId: "i-nvda",
    side: "BUY",
    quantity: 50,
    price: 275.20,
    fee: 0,
    executedAt: "2026-03-15T22:50:00+09:00",
    thesis:
      "애플 매도 자금으로 비중 추가. 데이터센터 가이던스 상향 확인.",
    confidence: 4,
    tags: ["AI", "추매"],
    fxToKRW: 1381,
  },
  {
    id: "t-009",
    instrumentId: "i-nvda",
    side: "SELL",
    quantity: 30,
    price: 290.50,
    fee: 0,
    executedAt: "2026-04-08T22:35:00+09:00",
    thesis:
      "단기 급등. 전체 포지션의 약 17% 부분 실현.",
    confidence: 3,
    tags: ["차익"],
    fxToKRW: 1379,
  },
];

// 대략 1340원대 USD/KRW 가정 (목 데이터)
export const USD_KRW = 1380;

/* ----------- 동향 탭 — 뉴스 / 이벤트 / 카탈리스트 ----------- */

export type NewsCategory = "STOCK" | "FX" | "COMMODITY" | "MACRO" | "SECTOR";
export type NewsImpact = "POSITIVE" | "NEGATIVE" | "NEUTRAL";

export type NewsItem = {
  headline: string;
  source: string;
  category: NewsCategory;
  impact: NewsImpact;
  url?: string;
};

/** 특정 종목이 ±3% 이상 움직인 하루 — 뉴스 + 요약을 함께 담는다. */
export type MarketEvent = {
  instrumentId: string;
  /** YYYY-MM-DD (로컬 날짜) */
  date: string;
  /** 전일 대비 종가 변동률 (0.058 = +5.8%) */
  dayChangePct: number;
  news: NewsItem[];
  summary: string;
};

export type InstrumentCatalyst = {
  instrumentId: string;
  positives: string[];
  negatives: string[];
};

/** 수동 작성 이벤트 모음. 실제 뉴스 피드 연결 전 UI 검증용. */
export const MARKET_EVENTS: MarketEvent[] = [
  // NVDA — 급등·급락 혼재
  {
    instrumentId: "i-nvda",
    date: "2026-02-18",
    dayChangePct: -0.052,
    summary:
      "빅테크 CAPEX 의구심이 다시 살아나면서 반도체 섹터 전반 약세. 메타 실적 컨콜에서 내년 capex 상단 가이던스가 시장 기대치를 못 미쳤고, 미 10년물 금리 상승이 겹쳐 밸류에이션 민감주 타격. 엔비디아 -5.2%.",
    news: [
      { headline: "메타, 2027 CAPEX 가이던스 시장 기대치 하회", source: "Bloomberg", category: "SECTOR", impact: "NEGATIVE" },
      { headline: "미 10년물 금리 4.6% 돌파, 기술주 프리미엄 압박", source: "WSJ", category: "MACRO", impact: "NEGATIVE" },
      { headline: "엔비디아 옵션 시장 풋콜 비율 급등", source: "Barron's", category: "STOCK", impact: "NEGATIVE" },
      { headline: "달러 인덱스 0.6% 상승, 신흥국 자금 이탈", source: "FT", category: "FX", impact: "NEUTRAL" },
    ],
  },
  {
    instrumentId: "i-nvda",
    date: "2026-03-18",
    dayChangePct: 0.058,
    summary:
      "금리 하락 랠리에 HBM 공급망 뉴스가 겹치면서 반도체 섹터 전반 강세. 엔비디아 +5.8%로 섹터 평균을 상회. 블랙웰 차세대 수율 리포트와 TSMC 2nm 조기 양산이 연달아 호재로 작용.",
    news: [
      { headline: "블랙웰 생산 수율 개선 보고", source: "The Information", category: "STOCK", impact: "POSITIVE" },
      { headline: "미 10년물 금리 급락, 기술주 랠리", source: "WSJ", category: "MACRO", impact: "POSITIVE" },
      { headline: "TSMC 2nm 공정 조기 양산 공시", source: "Nikkei", category: "SECTOR", impact: "POSITIVE" },
      { headline: "달러 인덱스 1% 하락", source: "FT", category: "FX", impact: "NEUTRAL" },
      { headline: "SK하이닉스 HBM4 샘플 출하 시작", source: "한경", category: "SECTOR", impact: "POSITIVE" },
    ],
  },
  {
    instrumentId: "i-nvda",
    date: "2026-04-03",
    dayChangePct: 0.041,
    summary:
      "GTC 2026에서 Rubin 아키텍처 로드맵이 시장 기대치보다 빠른 것으로 공개. 인퍼런스 시장 확장 시그널로 해석되면서 +4.1%. 달러 약세까지 겹쳐 원화 환산 수익률은 더 유리.",
    news: [
      { headline: "엔비디아 GTC에서 Rubin 세대 아키텍처 선공개", source: "Reuters", category: "STOCK", impact: "POSITIVE" },
      { headline: "AWS, 내년 인퍼런스 GPU 조달 규모 2배 확대", source: "CNBC", category: "SECTOR", impact: "POSITIVE" },
      { headline: "달러 약세, 원/달러 1,370원대 복귀", source: "연합인포맥스", category: "FX", impact: "POSITIVE" },
    ],
  },
  // 삼성전자 — 국내 KRW
  {
    instrumentId: "i-samsung",
    date: "2026-03-05",
    dayChangePct: 0.037,
    summary:
      "HBM3E 12단 퀄 통과 루머와 외국인 순매수 전환이 겹치며 +3.7%. 원화 강세도 매수세에 힘을 보탬.",
    news: [
      { headline: "삼성전자 HBM3E 12단 엔비디아 퀄 통과 루머", source: "전자신문", category: "STOCK", impact: "POSITIVE" },
      { headline: "외국인, 4거래일 만에 코스피 순매수 전환", source: "한경", category: "MACRO", impact: "POSITIVE" },
      { headline: "원/달러 1,380원대 반납, 위험선호 회복", source: "연합인포맥스", category: "FX", impact: "POSITIVE" },
      { headline: "LG이노텍 동반 강세", source: "매일경제", category: "SECTOR", impact: "NEUTRAL" },
    ],
  },
  {
    instrumentId: "i-samsung",
    date: "2026-04-01",
    dayChangePct: -0.034,
    summary:
      "1분기 잠정 실적 발표 직전 경계심 + 메모리 가격 상승 속도 둔화 보고서가 겹쳐 -3.4%. 차익 실현 물량 집중.",
    news: [
      { headline: "트렌드포스, DRAM 현물가 상승폭 둔화 관찰", source: "TrendForce", category: "SECTOR", impact: "NEGATIVE" },
      { headline: "삼성전자 1Q 잠정실적 발표 임박, 차익 매물", source: "매일경제", category: "STOCK", impact: "NEGATIVE" },
      { headline: "미 소비자물가 전망치 상회, 금리 인하 지연 전망", source: "WSJ", category: "MACRO", impact: "NEGATIVE" },
    ],
  },
  // TSLA — watchlist
  {
    instrumentId: "i-tsla",
    date: "2026-04-12",
    dayChangePct: -0.061,
    summary:
      "1분기 인도량이 컨센서스를 크게 하회. 중국 가격 경쟁 심화가 다시 부각되면서 마진 우려 부각 → -6.1%. 동종 EV 섹터 동반 약세.",
    news: [
      { headline: "테슬라 1Q 인도량 컨센서스 -8% 하회", source: "Reuters", category: "STOCK", impact: "NEGATIVE" },
      { headline: "중국 BYD, 모델3/Y 겨냥 신규 인센티브 발표", source: "Bloomberg", category: "SECTOR", impact: "NEGATIVE" },
      { headline: "리튬 현물가 추가 하락, EV 마진 디플레 우려", source: "SMM", category: "COMMODITY", impact: "NEGATIVE" },
      { headline: "유럽 EV 보조금 축소 발표", source: "FT", category: "MACRO", impact: "NEGATIVE" },
    ],
  },
  {
    instrumentId: "i-tsla",
    date: "2026-03-22",
    dayChangePct: 0.074,
    summary:
      "오토파일럿 FSD v13 공개 시연이 호평 받으며 +7.4%. 로보택시 상용화 시점 기대가 다시 끓어오름.",
    news: [
      { headline: "테슬라 FSD v13 공개 시연, 교통량 많은 LA 도심 주행 성공", source: "Electrek", category: "STOCK", impact: "POSITIVE" },
      { headline: "Cathie Wood, 테슬라 목표가 상향", source: "CNBC", category: "STOCK", impact: "POSITIVE" },
      { headline: "로보택시 관련 서플라이체인 일제 강세", source: "Reuters", category: "SECTOR", impact: "POSITIVE" },
    ],
  },
];

export const INSTRUMENT_CATALYSTS: InstrumentCatalyst[] = [
  {
    instrumentId: "i-nvda",
    positives: [
      "Rubin 세대 로드맵 공개 — 인퍼런스 수요 확장 시그널",
      "블랙웰 수율 개선 + HBM3E 공급망 안정",
      "하이퍼스케일러 GPU capex 2배 확대 가이던스",
    ],
    negatives: [
      "빅테크 capex 피크아웃 논쟁 (메타 컨콜 이후 재점화)",
      "미 10년물 금리 상승 시 밸류에이션 민감",
      "중국향 수출 규제 재강화 가능성",
    ],
  },
  {
    instrumentId: "i-samsung",
    positives: [
      "HBM3E 12단 엔비디아 퀄 통과 기대",
      "외국인 자금 복귀, 원화 강세 구간에서 수급 개선",
      "밸류업 프로그램 수혜주",
    ],
    negatives: [
      "DRAM 현물가 상승 속도 둔화 신호",
      "1Q 잠정실적 발표 경계심",
      "중국 창신메모리 경쟁 압력",
    ],
  },
  {
    instrumentId: "i-tsla",
    positives: [
      "FSD v13 실도로 시연 성공 — 로보택시 모멘텀",
      "에너지 저장 부문 매출 성장",
    ],
    negatives: [
      "1Q 인도량 컨센서스 -8% 하회",
      "중국 BYD의 가격 경쟁 심화",
      "유럽 EV 보조금 축소",
      "리튬 가격 하락에 따른 마진 디플레 우려",
    ],
  },
];

/** 특정 종목의 이벤트 목록 (최신순) */
export function eventsFor(instrumentId: string): MarketEvent[] {
  return MARKET_EVENTS.filter((e) => e.instrumentId === instrumentId).sort(
    (a, b) => b.date.localeCompare(a.date)
  );
}

export function catalystFor(instrumentId: string): InstrumentCatalyst | undefined {
  return INSTRUMENT_CATALYSTS.find((c) => c.instrumentId === instrumentId);
}

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
  /** 원화 기준 평가손익 */
  krwUnrealized: number;
  krwUnrealizedPct: number;
};

export function computePositions(
  trades: Trade[] = TRADES,
  currentFx: number = USD_KRW
): Position[] {
  const byInst = new Map<string, Trade[]>();
  for (const t of trades) {
    const arr = byInst.get(t.instrumentId) ?? [];
    arr.push(t);
    byInst.set(t.instrumentId, arr);
  }
  const positions: Position[] = [];
  for (const [iid, list] of byInst) {
    const instrument = inst(iid);
    const sorted = [...list].sort((a, b) => a.executedAt.localeCompare(b.executedAt));
    const lots: { qty: number; price: number; fx: number }[] = [];
    for (const t of sorted) {
      if (t.side === "BUY") {
        const fx = instrument.currency === "KRW" ? 1 : (t.fxToKRW ?? currentFx);
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
      unrealizedPct: unrealized / cost,
      krwAvgCost,
      krwMarketValue,
      krwUnrealized,
      krwUnrealizedPct,
    });
  }
  // 평가금액 KRW 환산 순 정렬
  positions.sort((a, b) => b.krwMarketValue - a.krwMarketValue);
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
    total += p.krwMarketValue;
    cost += p.krwAvgCost * p.quantity;
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

/**
 * 매매 상세 차트용 가상 가격 시계열 생성.
 * 실제 과거 시세가 연동되기 전까지 사용되는 mock. 매매 체결가 + 이벤트 dayChangePct + 현재가를 anchor로 고정한다.
 * - 시작: 최초 매매/이벤트 기준 30일 전 (매매 없으면 가장 이른 이벤트 30일 전, 둘 다 없으면 now - 60일)
 * - 끝: max(오늘, 최종 매매+7일)
 * - 매매일·이벤트일마다 anchor, 그 사이는 선형 보간 + 결정론적 노이즈
 * - 이벤트 anchor 가격: 직전 anchor 가격 × (1 + dayChangePct) (연쇄 적용)
 */
export function generatePriceSeries(
  instrument: Instrument,
  trades: Trade[],
  now: Date = new Date(),
  events: MarketEvent[] = []
): { date: string; price: number }[] {
  const msPerDay = 86400000;
  const sortedTrades = [...trades].sort((a, b) =>
    a.executedAt.localeCompare(b.executedAt)
  );
  const sortedEvents = [...events].sort((a, b) => a.date.localeCompare(b.date));

  // 시작/끝 결정
  const earliestTradeMs = sortedTrades.length
    ? new Date(sortedTrades[0].executedAt).getTime()
    : Infinity;
  const earliestEventMs = sortedEvents.length
    ? new Date(sortedEvents[0].date).getTime()
    : Infinity;
  const earliestMs = Math.min(earliestTradeMs, earliestEventMs);
  const start =
    earliestMs === Infinity
      ? new Date(now.getTime() - 60 * msPerDay)
      : new Date(earliestMs - 30 * msPerDay);

  const latestTradeMs = sortedTrades.length
    ? new Date(sortedTrades[sortedTrades.length - 1].executedAt).getTime()
    : -Infinity;
  const end =
    now.getTime() > latestTradeMs
      ? now
      : new Date(latestTradeMs + 7 * msPerDay);

  // 결정론적 의사난수 (instrument.id seed)
  let seed = 0;
  for (const c of instrument.id) seed = (Math.imul(seed, 31) + c.charCodeAt(0)) >>> 0;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0xffffffff - 0.5; // -0.5 ~ 0.5
  };

  const totalDays = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / msPerDay)
  );

  // 앵커 후보들을 인덱스별로 수집 (매매 > 이벤트 > 시작/끝 기본값)
  type Anchor =
    | { idx: number; kind: "TRADE" | "END" | "START"; price: number }
    | { idx: number; kind: "EVENT"; dayChangePct: number };
  const rawAnchors: Anchor[] = [];

  // 시작 가격 기본값: 맨 처음 매매가 있으면 그 가격의 94-98%, 없으면 현재가의 90-100% 사이
  const basisPrice = sortedTrades.length
    ? sortedTrades[0].price
    : instrument.currentPrice;
  const startPrice = basisPrice * (0.94 + rand() * 0.04);
  rawAnchors.push({ idx: 0, kind: "START", price: startPrice });

  for (const t of sortedTrades) {
    const idx = Math.round(
      (new Date(t.executedAt).getTime() - start.getTime()) / msPerDay
    );
    rawAnchors.push({ idx, kind: "TRADE", price: t.price });
  }
  for (const e of sortedEvents) {
    const idx = Math.round(
      (new Date(e.date).getTime() - start.getTime()) / msPerDay
    );
    rawAnchors.push({ idx, kind: "EVENT", dayChangePct: e.dayChangePct });
  }
  rawAnchors.push({ idx: totalDays, kind: "END", price: instrument.currentPrice });

  // 인덱스 순 정렬, 같은 인덱스는 TRADE > EVENT > START/END 순으로 우선
  const rank = { TRADE: 0, EVENT: 1, START: 2, END: 2 } as const;
  rawAnchors.sort((a, b) => a.idx - b.idx || rank[a.kind] - rank[b.kind]);

  // EVENT anchor의 실제 가격 = 직전 anchor 가격 × (1 + dayChangePct) 로 고정
  // 인덱스당 단일 가격 맵 생성 (중복 인덱스는 앞선 rank 우선이 유지됨)
  const anchors: { idx: number; price: number }[] = [];
  let lastPrice = startPrice;
  for (const a of rawAnchors) {
    let price: number;
    if (a.kind === "EVENT") {
      price = lastPrice * (1 + a.dayChangePct);
    } else {
      price = a.price;
    }
    const existing = anchors.find((x) => x.idx === a.idx);
    if (existing) continue; // rank 우선 규칙으로 처음 등장한 것 유지
    anchors.push({ idx: a.idx, price });
    lastPrice = price;
  }

  const points: { date: string; price: number }[] = [];
  let ai = 0;
  for (let i = 0; i <= totalDays; i++) {
    while (ai < anchors.length - 1 && anchors[ai + 1].idx <= i) ai++;
    const a = anchors[ai];
    const b = anchors[Math.min(ai + 1, anchors.length - 1)];
    let price: number;
    if (i === a.idx) {
      price = a.price;
    } else if (i === b.idx) {
      price = b.price;
    } else {
      const r = (i - a.idx) / Math.max(1, b.idx - a.idx);
      const base = a.price + (b.price - a.price) * r;
      price = base + base * 0.03 * rand();
    }
    const d = new Date(start.getTime() + i * msPerDay);
    points.push({ date: d.toISOString(), price });
  }
  return points;
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
