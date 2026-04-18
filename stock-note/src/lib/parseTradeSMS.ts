// NH투자증권 SMS 파서.
// 체결 알림(국내/해외)과 환전 내역 문자를 매매 등록 폼에 자동 입력하기 위해 구조화된 결과를 반환한다.
// 다른 증권사 포맷은 추후 분기 추가.

export type ParsedStock = {
  kind: "STOCK";
  broker: "NH";
  side: "BUY" | "SELL";
  symbol: string;
  name: string;
  currency: "KRW" | "USD";
  quantity: number;
  price: number;
  /** ISO string. SMS에 시각이 없으면 해당 일자의 00:00 로컬 */
  executedAt?: string;
};

export type ParsedFX = {
  kind: "FX";
  broker: "NH";
  direction: "KRW_TO_FX" | "FX_TO_KRW";
  currency: "USD";
  rate: number;
  fxAmount: number;
  krwAmount: number;
  executedAt?: string;
};

export type ParsedUnknown = { kind: "UNKNOWN"; raw: string };
export type ParsedSMS = ParsedStock | ParsedFX | ParsedUnknown;

/** "라벨: 값" 한 줄에서 값만 추출 */
function field(text: string, label: string): string | undefined {
  const re = new RegExp(`${label}\\s*[:：]\\s*([^\\n\\r]+)`);
  const m = text.match(re);
  return m?.[1].trim();
}

/** "33,060원" "138주" "680.00" 등에서 숫자만 뽑아 number로 */
function toNumber(s: string): number {
  const cleaned = s.replace(/[^\d.]/g, "");
  return cleaned ? parseFloat(cleaned) : 0;
}

/** "04월13일" "2월 10일" → ISO. 해당 월/일이 미래면 작년으로 간주 */
function parseKDate(s: string): string | undefined {
  const m = s.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (!m) return undefined;
  const month = parseInt(m[1], 10);
  const day = parseInt(m[2], 10);
  const now = new Date();
  const thisYear = new Date(now.getFullYear(), month - 1, day);
  const year = thisYear > now ? now.getFullYear() - 1 : now.getFullYear();
  return new Date(year, month - 1, day).toISOString();
}

export function parseTradeSMS(text: string): ParsedSMS {
  const t = text.replace(/\r/g, "").trim();
  if (!t) return { kind: "UNKNOWN", raw: text };

  // 환전
  if (t.includes("환전내역") || t.includes("환전구분")) {
    const direction = field(t, "환전구분") ?? "";
    return {
      kind: "FX",
      broker: "NH",
      direction: direction.includes("외화매수") ? "KRW_TO_FX" : "FX_TO_KRW",
      currency: "USD",
      rate: toNumber(field(t, "환율") ?? ""),
      fxAmount: toNumber(field(t, "외화금액") ?? ""),
      krwAmount: toNumber(field(t, "원화금액") ?? ""),
      executedAt: parseKDate(field(t, "환전일자") ?? ""),
    };
  }

  // 해외 체결 ("해외주식" 또는 "거래통화" 라벨 존재)
  if (t.includes("해외주식") || t.includes("거래통화")) {
    const sideRaw = field(t, "매매구분") ?? "";
    const side: "BUY" | "SELL" = sideRaw.includes("매수") ? "BUY" : "SELL";
    const nameRaw = field(t, "종목명") ?? "";
    // "(SPY US)SPDR S&P 500 ETF" → ticker "SPY", name 나머지
    const tickerMatch = nameRaw.match(/\(([A-Z.\-]+)\s+[A-Z]+\)/);
    const symbol = tickerMatch?.[1] ?? "";
    const name = nameRaw.replace(/^\([^)]+\)\s*/, "").trim();
    const qtyRaw = field(t, "체결수량") ?? field(t, "주문수량") ?? "";
    const priceRaw = field(t, "체결가격") ?? "";
    const currencyRaw = (field(t, "거래통화") ?? "USD").toUpperCase();
    return {
      kind: "STOCK",
      broker: "NH",
      side,
      symbol,
      name,
      // 현재는 USD 해외만. 향후 JPY/HKD 등 확장 지점
      currency: currencyRaw === "USD" ? "USD" : "USD",
      quantity: toNumber(qtyRaw),
      price: toNumber(priceRaw),
      executedAt: parseKDate(field(t, "주문일자") ?? ""),
    };
  }

  // 국내 체결
  if (
    t.includes("주문체결 알림") ||
    t.includes("체결단가") ||
    t.includes("종목코드")
  ) {
    const header = t.split("\n")[0] ?? "";
    const kind = field(t, "체결종류") ?? "";
    const side: "BUY" | "SELL" =
      header.includes("매도") || kind.includes("매도") ? "SELL" : "BUY";
    return {
      kind: "STOCK",
      broker: "NH",
      side,
      symbol: field(t, "종목코드") ?? "",
      name: field(t, "종목명") ?? "",
      currency: "KRW",
      quantity: toNumber(field(t, "체결수량") ?? ""),
      price: toNumber(field(t, "체결단가") ?? ""),
    };
  }

  return { kind: "UNKNOWN", raw: text };
}
