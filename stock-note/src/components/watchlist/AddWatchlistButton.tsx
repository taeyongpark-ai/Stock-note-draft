"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Search, X } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { addWatchlist } from "@/app/trend/actions";
import type { InferSelectModel } from "drizzle-orm";
import type { instruments } from "@/db/schema";

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
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const existing = useMemo(() => new Set(existingIds), [existingIds]);

  const filtered = useMemo(() => {
    const pool = allInstruments.filter((i) => !existing.has(i.id));
    if (!q.trim()) return pool;
    const needle = q.toLowerCase();
    return pool.filter(
      (i) =>
        i.name.toLowerCase().includes(needle) ||
        i.symbol.toLowerCase().includes(needle)
    );
  }, [allInstruments, existing, q]);

  function close() {
    setOpen(false);
    setQ("");
    setPendingId(null);
  }

  function onPick(id: string) {
    setPendingId(id);
    startTransition(async () => {
      await addWatchlist(id);
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
                  placeholder="종목명 또는 티커 검색"
                  className="bg-transparent outline-none w-full text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-1 pb-3">
              {filtered.length === 0 ? (
                <div className="py-10 text-center text-sm text-[color:var(--text-muted)]">
                  {allInstruments.length === existing.size
                    ? "모든 종목이 이미 관심 등록돼 있어요."
                    : "일치하는 종목이 없습니다."}
                </div>
              ) : (
                filtered.map((i) => (
                  <button
                    key={i.id}
                    disabled={pending}
                    onClick={() => onPick(i.id)}
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
                    {pendingId === i.id && (
                      <span className="text-xs text-[color:var(--text-muted)]">
                        추가 중…
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
