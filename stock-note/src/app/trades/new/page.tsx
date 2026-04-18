"use client";
import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import Logo from "@/components/ui/Logo";
import { INSTRUMENTS, type Instrument } from "@/lib/mock";
import { ChevronLeft, Search } from "lucide-react";

export default function NewTradePage() {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Instrument | null>(null);
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [thesis, setThesis] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [tagInput, setTagInput] = useState("");

  const results = q
    ? INSTRUMENTS.filter(
        (i) =>
          i.name.toLowerCase().includes(q.toLowerCase()) ||
          i.symbol.toLowerCase().includes(q.toLowerCase())
      )
    : [];

  const total = selected && qty && price ? Number(qty) * Number(price) : 0;
  const canSubmit = selected && qty && price && thesis.trim().length >= 5;

  return (
    <div className="space-y-4 pt-2 pb-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="w-9 h-9 -ml-2 grid place-items-center">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-[20px] font-extrabold">매매 등록</h1>
      </div>

      {/* 매수/매도 토글 */}
      <div className="grid grid-cols-2 gap-2 bg-white rounded-2xl p-1 border border-[color:var(--border)]">
        <button
          onClick={() => setSide("BUY")}
          className={`py-3 rounded-xl font-bold text-[15px] ${
            side === "BUY"
              ? "bg-[color:var(--up-bg)] text-[color:var(--up)]"
              : "text-[color:var(--text-muted)]"
          }`}
        >
          매수
        </button>
        <button
          onClick={() => setSide("SELL")}
          className={`py-3 rounded-xl font-bold text-[15px] ${
            side === "SELL"
              ? "bg-[color:var(--down-bg)] text-[color:var(--down)]"
              : "text-[color:var(--text-muted)]"
          }`}
        >
          매도
        </button>
      </div>

      {/* 종목 선택 */}
      <Card className="p-5 space-y-3">
        <label className="text-sm font-bold">종목</label>
        {selected ? (
          <div className="flex items-center gap-3">
            <Logo name={selected.name} color={selected.color} size={44} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{selected.name}</div>
              <div className="text-xs text-[color:var(--text-muted)]">
                {selected.market} · {selected.symbol} · 현재가{" "}
                {selected.currentPrice.toLocaleString()}
                {selected.currency === "KRW" ? "원" : ` ${selected.currency}`}
              </div>
            </div>
            <button
              onClick={() => {
                setSelected(null);
                setQ("");
              }}
              className="text-xs text-[color:var(--text-muted)] underline"
            >
              변경
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 bg-[color:var(--card-muted)] rounded-xl px-3 py-2.5">
              <Search size={18} className="text-[color:var(--text-muted)]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="종목명 또는 티커 검색"
                className="bg-transparent outline-none w-full text-sm"
              />
            </div>
            {results.length > 0 && (
              <div className="border-t border-[color:var(--border)] -mx-5 px-1 mt-1">
                {results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[color:var(--card-muted)] rounded-xl"
                  >
                    <Logo name={r.name} color={r.color} size={36} />
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-[14px]">{r.name}</div>
                      <div className="text-xs text-[color:var(--text-muted)]">
                        {r.market} · {r.symbol}
                      </div>
                    </div>
                    <div className="text-[13px] tabular font-semibold">
                      {r.currentPrice.toLocaleString()}
                      {r.currency === "KRW" ? "원" : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      {/* 수량 가격 */}
      <Card className="p-5 space-y-4">
        <div>
          <label className="text-sm font-bold">수량</label>
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            placeholder="0"
            className="mt-2 w-full text-right text-[22px] font-bold tabular bg-[color:var(--card-muted)] rounded-xl px-4 py-3 outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-bold">
            체결가{" "}
            {selected && (
              <span className="text-[color:var(--text-muted)] font-normal">
                ({selected.currency === "KRW" ? "원" : selected.currency})
              </span>
            )}
          </label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            placeholder={selected ? String(selected.currentPrice) : "0"}
            className="mt-2 w-full text-right text-[22px] font-bold tabular bg-[color:var(--card-muted)] rounded-xl px-4 py-3 outline-none"
          />
        </div>
        {total > 0 && selected && (
          <div className="flex items-center justify-between pt-2 border-t border-[color:var(--border)]">
            <span className="text-sm text-[color:var(--text-muted)]">거래대금</span>
            <span className="text-[18px] font-black tabular">
              {total.toLocaleString(undefined, {
                maximumFractionDigits: selected.currency === "KRW" ? 0 : 2,
              })}
              {selected.currency === "KRW" ? "원" : ` ${selected.currency}`}
            </span>
          </div>
        )}
      </Card>

      {/* 이유 & 확신도 */}
      <Card className="p-5 space-y-4">
        <div>
          <label className="text-sm font-bold">
            왜 샀나요? <span className="text-[color:var(--up)]">*</span>
          </label>
          <textarea
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
            rows={4}
            placeholder="이 매매의 근거를 적어두세요. 지금 적은 내용이 나중 복기의 기준이 됩니다."
            className="mt-2 w-full bg-[color:var(--card-muted)] rounded-xl px-4 py-3 outline-none text-[14px] resize-none"
          />
          <div className="text-right text-xs text-[color:var(--text-subtle)] mt-1">
            {thesis.length} / 최소 5자
          </div>
        </div>

        <div>
          <label className="text-sm font-bold">확신도</label>
          <div className="mt-3 flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setConfidence(n)}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${
                  confidence >= n
                    ? "bg-[color:var(--accent)] text-white"
                    : "bg-[color:var(--card-muted)] text-[color:var(--text-subtle)]"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="text-xs text-[color:var(--text-muted)] mt-2">
            {["", "매우 불확실", "약간 의심", "보통", "강한 확신", "매우 강한 확신"][confidence]}
          </div>
        </div>

        <div>
          <label className="text-sm font-bold">태그</label>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="예: AI, 장기, 턴어라운드 (쉼표로 구분)"
            className="mt-2 w-full bg-[color:var(--card-muted)] rounded-xl px-4 py-3 outline-none text-sm"
          />
        </div>
      </Card>

      <button
        disabled={!canSubmit}
        className={`w-full py-4 rounded-2xl text-[16px] font-bold shadow-lg ${
          canSubmit
            ? "bg-[color:var(--accent)] text-white"
            : "bg-[color:var(--card-muted)] text-[color:var(--text-subtle)]"
        }`}
        onClick={() => alert("미리보기 모드: 저장은 DB 연결 후 동작합니다.")}
      >
        {side === "BUY" ? "매수 기록" : "매도 기록"}
      </button>
    </div>
  );
}
