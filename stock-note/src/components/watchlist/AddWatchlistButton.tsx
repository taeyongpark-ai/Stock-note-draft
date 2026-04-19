"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Search, X, Globe } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { addWatchlist, addWatchlistFromSearch } from "@/app/trend/actions";
import type { InferSelectModel } from "drizzle-orm";
import type { instruments } from "@/db/schema";
import type { SearchHit } from "@/lib/prices";

type Instrument = InferSelectModel<typeof instruments>;

export default function AddWatchlistButton({
  allInstruments,
  existingIds,
}: {
  allInstruments: Instrument[];
  existingIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [remoteHits, setRemoteHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [pending, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const existing = useMemo(() => new Set(existingIds), [existingIds]);
  const existingSymbols = useMemo(
    () => new Set(allInstruments.map((i) => i.symbol.toUpperCase())),
    [allInstruments]
  );

  const localMatches = useMemo(() => {
    const pool = allInstruments.filter((i) => !existing.has(i.id));
    if (!q.trim()) return pool;
    const needle = q.toLowerCase();
    return pool.filter(
      (i) =>
        i.name.toLowerCase().includes(needle) ||
        i.symbol.toLowerCase().includes(needle)
    );
  }, [allInstruments, existing, q]);

  // Yahoo 검색 (디바운스 300ms)
  useEffect(() => {
    if (!q.trim() || q.trim().length < 2) {
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
  }, [q]);

  // 이미 DB에 있는 심볼은 Yahoo 결과에서 제외 (중복 방지)
  const newRemoteHits = useMemo(
    () => remoteHits.filter((h) => !existingSymbols.has(h.symbol.toUpperCase())),
    [remoteHits, existingSymbols]
  );

  function close() {
    setOpen(false);
    setQ("");
    setRemoteHits([]);
    setPendingKey(null);
  }

  function onPickLocal(id: string) {
    setPendingKey(id);
    startTransition(async () => {
      await addWatchlist(id);
      close();
    });
  }

  function onPickRemote(hit: SearchHit) {
    setPendingKey(`remote-${hit.symbol}`);
    startTransition(async () => {
      await addWatchlistFromSearch(hit);
      close();
    });
  }

  return (
    <>
      <button
        aria-label="관심 종목 추가"
        onClick={() => setOpen(true)}
        className="w-7 h-7 grid place-items-center rounded-full bg-[color:var(--card-muted)] text-[color:var(--text-muted)] hover:bg-[color:var(--border)] transition"
      >
        <Plus size={16} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
          onClick={close}
        >
          <div
            className="w-full max-w-[480px] max-h-[80vh] bg-[color:var(--card)] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--border)]">
              <span className="font-bold text-[15px]">관심 종목 추가</span>
              <button
                aria-label="닫기"
                onClick={close}
                className="w-8 h-8 grid place-items-center -mr-2 text-[color:var(--text-muted)]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-5 pt-3 pb-2">
              <div className="flex items-center gap-2 bg-[color:var(--card-muted)] rounded-xl px-3 py-2.5">
                <Search size={18} className="text-[color:var(--text-muted)]" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="종목명 또는 티커 검색 (예: 삼성, NVDA, 005930)"
                  className="bg-transparent outline-none w-full text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-1 pb-3">
              {/* 기존 DB 종목 */}
              {localMatches.length > 0 && (
                <>
                  <div className="px-5 py-2 text-[11px] font-bold text-[color:var(--text-subtle)] uppercase">
                    등록된 종목
                  </div>
                  {localMatches.map((i) => (
                    <button
                      key={i.id}
                      disabled={pending}
                      onClick={() => onPickLocal(i.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[color:var(--card-muted)] rounded-xl text-left disabled:opacity-50"
                    >
                      <Logo name={i.name} color={i.color} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[14px] truncate">
                          {i.name}
                        </div>
                        <div className="text-xs text-[color:var(--text-muted)]">
                          {i.market} · {i.symbol}
                        </div>
                      </div>
                      {pendingKey === i.id && (
                        <span className="text-xs text-[color:var(--text-muted)]">
                          추가 중…
                        </span>
                      )}
                    </button>
                  ))}
                </>
              )}

              {/* Yahoo 검색 결과 (신규 종목) */}
              {q.trim().length >= 2 && (
                <>
                  <div className="px-5 py-2 mt-1 text-[11px] font-bold text-[color:var(--text-subtle)] uppercase flex items-center gap-1.5">
                    <Globe size={12} />
                    Yahoo Finance 검색
                    {searching && (
                      <span className="font-normal text-[color:var(--text-subtle)]">
                        검색 중…
                      </span>
                    )}
                  </div>
                  {!searching && newRemoteHits.length === 0 && (
                    <div className="py-6 text-center text-xs text-[color:var(--text-muted)]">
                      검색 결과 없음
                    </div>
                  )}
                  {newRemoteHits.map((hit) => {
                    const key = `remote-${hit.symbol}`;
                    return (
                      <button
                        key={key}
                        disabled={pending}
                        onClick={() => onPickRemote(hit)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[color:var(--card-muted)] rounded-xl text-left disabled:opacity-50"
                      >
                        <Logo name={hit.name} color="#94A3B8" size={36} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[14px] truncate">
                            {hit.name}
                          </div>
                          <div className="text-xs text-[color:var(--text-muted)]">
                            {hit.exchange} · {hit.symbol}
                          </div>
                        </div>
                        {pendingKey === key && (
                          <span className="text-xs text-[color:var(--text-muted)]">
                            추가 중…
                          </span>
                        )}
                      </button>
                    );
                  })}
                </>
              )}

              {/* 초기 상태 */}
              {!q.trim() && localMatches.length === 0 && (
                <div className="py-10 text-center text-sm text-[color:var(--text-muted)]">
                  {allInstruments.length === existing.size
                    ? "모든 종목이 이미 관심 등록돼 있어요."
                    : "종목명을 입력해 검색해보세요."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
