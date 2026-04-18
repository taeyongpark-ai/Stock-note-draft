export function formatMoney(n: number, currency: string = "KRW"): string {
  if (currency === "KRW") {
    return Math.round(n).toLocaleString("ko-KR") + "원";
  }
  if (currency === "USD") {
    return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  return n.toLocaleString() + " " + currency;
}

export function formatNumber(n: number, digits = 2): string {
  return n.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function formatPct(x: number, digits = 2): string {
  const sign = x > 0 ? "+" : "";
  return `${sign}${(x * 100).toFixed(digits)}%`;
}

// 한국식: +면 up(빨강), -면 down(파랑)
export function deltaClass(x: number): string {
  if (x > 0) return "text-[color:var(--up)]";
  if (x < 0) return "text-[color:var(--down)]";
  return "text-[color:var(--flat)]";
}

export function deltaArrow(x: number): string {
  if (x > 0) return "▲";
  if (x < 0) return "▼";
  return "·";
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function formatDateKo(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}
