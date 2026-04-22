"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import Logo from "@/components/ui/Logo";
import { parseTradeSMS } from "@/lib/parseTradeSMS";
import { createTrade, recordCashMovement } from "@/app/trades/actions";
import { ChevronLeft, Search, Globe } from "lucide-react";
import type { InferSelectModel } from "drizzle-orm";
import type { instruments } from "@/db/schema";
import type { SearchHit } from "@/lib/prices";

type Instrument = InferSelectModel<typeof instruments>;
type Market = Instrument["market"];
type SmsNote = { type: "ok" | "info" | "warn"; msg: string };

const pad2 = (n: number) => String(n).padStart(2, "0");
function toDatetimeLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export default function TradeForm({
  allInstruments,
}: {
  allInstruments: Instrument[];
}) {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Instrument | null>(null);
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [executedAt, setExecutedAt] = useState(() => toDatetimeLocal(new Date()));
  const [fxToKrw, setFxToKrw] = useState("");
  const [thesis, setThesis] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [tagInput, setTagInput] = useState("");
  const [sms, setSms] = useState("");
  const [smsNote, setSmsNote] = useState<SmsNote | null>(null);
  const [pending, startTransition] = useTransition();
  const [remoteHits, setRemoteHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [cashPending, setCashPending] = useState<
    | null
    | { direction: "IN" | "OUT"; amount: number; availableAfter?: number; executedAt?: string }
  >(null);

  // Yahoo 검색 (로컬에 없는 경우 대비)
  useEffect(() => {
    if (selected || !q.trim() || q.trim().length < 2) {
      setRemoteHits([]);
      return;
    }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        setRemoteHits(json.hits ?? []);
      } catch {
        setRemoteHits([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [q, selected]);

  function applySMS(text: string) {
    const parsed = parseTradeSMS(text);
    if (parsed.kind === "UNKNOWN") {
      setSmsNote({
        type: "warn",
        msg: "인식하지 못했어요. NH투자증권 체결/환전 문자 형식인지 확인해주세요.",
      });
      return;
    }
    if (parsed.kind === "FX") {
      const dirLabel =
        parsed.direction === "KRW_TO_FX" ? "원화 → 외화" : "외화 → 원화";
      setSmsNote({
        type: "info",
        msg: `환전 감지: ${dirLabel} ${parsed.currency} ${parsed.fxAmount.toLocaleString()} @ ${parsed.rate.toLocaleString()} — 환전 기록은 추후 외화계좌 기능 추가 후 지원합니다.`,
      });
      return;
    }
    if (parsed.kind === "CASH_IN" || parsed.kind === "CASH_OUT") {
      const isIn = parsed.kind === "CASH_IN";
      setCashPending({
        direction: isIn ? "IN" : "OUT",
        amount: parsed.amount,
        availableAfter: parsed.availableAfter,
        executedAt: parsed.executedAt,
      });
      setSmsNote({
        type: "info",
        msg: `${isIn ? "입금" : "출금"} ${parsed.amount.toLocaleString()}원 감지. 아래 "현금 잔고에 반영" 버튼을 눌러 확정하세요.`,
      });
      return;
    }
    setSide(parsed.side);
    setQty(parsed.quantity ? String(parsed.quantity) : "");
    setPrice(parsed.price ? String(parsed.price) : "");
    if (parsed.executedAt) {
      setExecutedAt(toDatetimeLocal(new Date(parsed.executedAt)));
    }
    const existing = allInstruments.find((i) => i.symbol === parsed.symbol);
    if (existing) {
      setSelected(existing);
      setSmsNote({
        type: "ok",
        msg: `${existing.name} · ${parsed.side === "BUY" ? "매수" : "매도"} ${parsed.quantity}${existing.currency === "USDT" ? "" : "주"} @ ${parsed.price.toLocaleString()}${parsed.currency === "KRW" ? "원" : " " + parsed.currency} 자동 입력됨`,
      });
      return;
    }
    const market: Market = parsed.currency === "USD" ? "NASDAQ" : "KRX";
    const synth: Instrument = {
      id: `sms-${parsed.symbol || parsed.name}`,
      symbol: parsed.symbol,
      name: parsed.name,
      market,
      currency: parsed.currency as Instrument["currency"],
      color: "#94A3B8",
      currentPrice: parsed.price,
      dayChange: 0,
    };
    setSelected(synth);
    setSmsNote({
      type: "info",
      msg: `${parsed.name}${parsed.symbol ? ` (${parsed.symbol})` : ""} — 등록된 종목 목록에 없어 임시로 불러왔어요.`,
    });
  }

  const results = q
    ? allInstruments.filter(
        (i) =>
          i.name.toLowerCase().includes(q.toLowerCase()) ||
          i.symbol.toLowerCase().includes(q.toLowerCase())
      )
    : [];

  const localSymbolsUpper = new Set(allInstruments.map((i) => i.symbol.toUpperCase()));
  const newRemoteHits = remoteHits.filter(
    (h) => !localSymbolsUpper.has(h.symbol.toUpperCase())
  );

  function pickRemote(hit: SearchHit) {
    // 선택만 — 실제 insert는 submit 시 createTrade가 newInstrument로 처리
    const synth: Instrument = {
      id: `yh-${hit.symbol}`,
      symbol: hit.symbol,
      name: hit.name,
      market: hit.market,
      currency: hit.currency,
      color: "#94A3B8",
      currentPrice: 0,
      dayChange: 0,
    };
    setSelected(synth);
    setQ("");
  }

  const total = selected && qty && price ? Number(qty) * Number(price) : 0;
  const canSubmit =
    !pending && selected && qty && price && thesis.trim().length >= 5;

  function handleSubmit() {
    if (!selected || !qty || !price) return;
    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    // DB에 없는 SMS 합성 종목이면 newInstrument 전달
    const isSynth = selected.id.startsWith("sms-") || !allInstruments.find((i) => i.id === selected.id);
    startTransition(async () => {
      await createTrade({
        instrumentId: isSynth ? undefined : selected.id,
        newInstrument: isSynth
          ? {
              symbol: selected.symbol,
              name: selected.name,
              market: selected.market,
              currency: selected.currency,
              color: selected.color,
              currentPrice: Number(price),
            }
          : undefined,
        side,
        quantity: Number(qty),
        price: Number(price),
        executedAt: new Date(executedAt).toISOString(),
        thesis,
        confidence,
        tags,
        fxToKrw: fxToKrw ? Number(fxToKrw) : undefined,
      });
    });
  }

  return (
    <div className="space-y-4 pt-2 pb-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="w-9 h-9 -ml-2 grid place-items-center">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-[20px] font-extrabold">매매 등록</h1>
      </div>

      {/* 증권사 문자 붙여넣기 */}
      <Card className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold">증권사 문자 자동 입력</label>
          <button
            onClick={() => applySMS(sms)}
            disabled={sms.trim().length === 0}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
              sms.trim().length === 0
                ? "bg-[color:var(--card-muted)] text-[color:var(--text-subtle)]"
                : "bg-[color:var(--accent)] text-white"
            }`}
          >
            분석
          </button>
        </div>
        <textarea
          value={sms}
          onChange={(e) => setSms(e.target.value)}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData("text");
            requestAnimationFrame(() => applySMS(pasted));
          }}
          rows={3}
          placeholder="체결/환전 문자를 그대로 붙여넣으면 자동으로 채워집니다 (NH투자증권 지원)"
          className="w-full bg-[color:var(--card-muted)] rounded-xl px-3 py-2.5 outline-none text-[13px] resize-none leading-relaxed"
        />
        {smsNote && (
          <div
            className={`text-xs rounded-lg px-3 py-2 leading-relaxed ${
              smsNote.type === "ok"
                ? "bg-[color:var(--up-bg)] text-[color:var(--up)]"
                : smsNote.type === "warn"
                ? "bg-[color:var(--down-bg)] text-[color:var(--down)]"
                : "bg-[color:var(--card-muted)] text-[color:var(--text-muted)]"
            }`}
          >
            {smsNote.msg}
          </div>
        )}
        {cashPending && (
          <button
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await recordCashMovement({
                  direction: cashPending.direction,
                  currency: "KRW",
                  amount: cashPending.amount,
                  executedAt: cashPending.executedAt,
                });
                setCashPending(null);
                setSms("");
                setSmsNote({
                  type: "ok",
                  msg: `원화 잔고에 ${cashPending.direction === "IN" ? "+" : "-"}${cashPending.amount.toLocaleString()}원 반영됨.`,
                });
              });
            }}
            className={`w-full py-3 rounded-xl text-sm font-bold ${
              pending
                ? "bg-[color:var(--card-muted)] text-[color:var(--text-subtle)]"
                : "bg-[color:var(--accent)] text-white"
            }`}
          >
            {pending
              ? "반영 중…"
              : `${cashPending.direction === "IN" ? "입금" : "출금"} ${cashPending.amount.toLocaleString()}원 현금 잔고에 반영`}
          </button>
        )}
      </Card>

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
            {(results.length > 0 || newRemoteHits.length > 0 || searching) && (
              <div className="border-t border-[color:var(--border)] -mx-5 px-1 mt-1 max-h-80 overflow-y-auto">
                {results.length > 0 && (
                  <>
                    <div className="px-4 py-2 text-[11px] font-bold text-[color:var(--text-subtle)] uppercase">
                      등록된 종목
                    </div>
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
                  </>
                )}
                {q.trim().length >= 2 && (
                  <>
                    <div className="px-4 py-2 text-[11px] font-bold text-[color:var(--text-subtle)] uppercase flex items-center gap-1.5">
                      <Globe size={12} />
                      Yahoo Finance 검색
                      {searching && (
                        <span className="font-normal text-[color:var(--text-subtle)]">
                          검색 중…
                        </span>
                      )}
                    </div>
                    {newRemoteHits.map((hit) => (
                      <button
                        key={hit.yahooTicker}
                        onClick={() => pickRemote(hit)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[color:var(--card-muted)] rounded-xl"
                      >
                        <Logo name={hit.name} color="#94A3B8" size={36} />
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-[14px]">{hit.name}</div>
                          <div className="text-xs text-[color:var(--text-muted)]">
                            {hit.exchange} · {hit.symbol}
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                )}
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

      {/* 거래일시 & 환율 */}
      <Card className="p-5 space-y-4">
        <div>
          <label className="text-sm font-bold">거래일시</label>
          <input
            type="datetime-local"
            value={executedAt}
            onChange={(e) => setExecutedAt(e.target.value)}
            className="mt-2 w-full bg-[color:var(--card-muted)] rounded-xl px-4 py-3 outline-none text-[15px] tabular"
          />
        </div>
        {selected && selected.currency !== "KRW" && (
          <div>
            <label className="text-sm font-bold">
              체결 시점 환율{" "}
              <span className="text-[color:var(--text-muted)] font-normal text-xs">
                (1 {selected.currency} = ? 원)
              </span>
            </label>
            <input
              value={fxToKrw}
              onChange={(e) =>
                setFxToKrw(e.target.value.replace(/[^0-9.]/g, ""))
              }
              inputMode="decimal"
              placeholder="예: 1385"
              className="mt-2 w-full text-right text-[20px] font-bold tabular bg-[color:var(--card-muted)] rounded-xl px-4 py-3 outline-none"
            />
            <p className="text-xs text-[color:var(--text-subtle)] mt-1.5 leading-relaxed">
              외화를 재사용한 경우, 최초 환전 시점 환율을 기입하세요.
            </p>
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
        onClick={handleSubmit}
        className={`w-full py-4 rounded-2xl text-[16px] font-bold shadow-lg ${
          canSubmit
            ? "bg-[color:var(--accent)] text-white"
            : "bg-[color:var(--card-muted)] text-[color:var(--text-subtle)]"
        }`}
      >
        {pending ? "저장 중…" : side === "BUY" ? "매수 기록" : "매도 기록"}
      </button>
    </div>
  );
}
