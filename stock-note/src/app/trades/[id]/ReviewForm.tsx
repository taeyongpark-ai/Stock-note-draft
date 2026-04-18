"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { addReview } from "@/app/trades/actions";
import { Pencil } from "lucide-react";

type Verdict = "GOOD" | "NEUTRAL" | "BAD";

export default function ReviewForm({ tradeId }: { tradeId: string }) {
  const [open, setOpen] = useState(false);
  const [verdict, setVerdict] = useState<Verdict>("NEUTRAL");
  const [reflection, setReflection] = useState("");
  const [counterfactualPrice, setCounterfactualPrice] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    if (reflection.trim().length < 5) return;
    startTransition(async () => {
      await addReview(tradeId, {
        verdict,
        reflection: reflection.trim(),
        counterfactualPrice: counterfactualPrice ? Number(counterfactualPrice) : undefined,
      });
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-4 rounded-2xl text-[15px] font-bold border-2 border-dashed border-[color:var(--border)] text-[color:var(--text-muted)] flex items-center justify-center gap-2 hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition"
      >
        <Pencil size={16} />
        복기 작성하기
      </button>
    );
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="font-bold text-[15px]">복기 작성</div>

      {/* 판정 */}
      <div>
        <label className="text-sm font-bold">이 매매를 돌아보면?</label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(["GOOD", "NEUTRAL", "BAD"] as Verdict[]).map((v) => (
            <button
              key={v}
              onClick={() => setVerdict(v)}
              className={`py-2.5 rounded-xl font-bold text-sm transition ${
                verdict === v
                  ? v === "GOOD"
                    ? "bg-[color:var(--up-bg)] text-[color:var(--up)]"
                    : v === "BAD"
                    ? "bg-[color:var(--down-bg)] text-[color:var(--down)]"
                    : "bg-[color:var(--card-muted)] text-[color:var(--text)]"
                  : "bg-[color:var(--card-muted)] text-[color:var(--text-subtle)]"
              }`}
            >
              {v === "GOOD" ? "👍 잘한 매매" : v === "BAD" ? "👎 아쉬운 매매" : "— 보통"}
            </button>
          ))}
        </div>
      </div>

      {/* 회고 */}
      <div>
        <label className="text-sm font-bold">
          돌아보며 <span className="text-[color:var(--up)]">*</span>
        </label>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          rows={4}
          placeholder="당시 판단의 무엇이 맞고 틀렸는지, 다음엔 어떻게 할지 적어두세요."
          className="mt-2 w-full bg-[color:var(--card-muted)] rounded-xl px-4 py-3 outline-none text-[14px] resize-none"
        />
        <div className="text-right text-xs text-[color:var(--text-subtle)] mt-1">
          {reflection.length} / 최소 5자
        </div>
      </div>

      {/* 기회비용 가격 (선택) */}
      <div>
        <label className="text-sm font-bold">
          기준 가격{" "}
          <span className="text-[color:var(--text-muted)] font-normal text-xs">
            (선택 — "지금 가격이 얼마였다면 달랐을까")
          </span>
        </label>
        <input
          value={counterfactualPrice}
          onChange={(e) =>
            setCounterfactualPrice(e.target.value.replace(/[^0-9.]/g, ""))
          }
          inputMode="decimal"
          placeholder="예: 350000"
          className="mt-2 w-full text-right text-[20px] font-bold tabular bg-[color:var(--card-muted)] rounded-xl px-4 py-3 outline-none"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => setOpen(false)}
          className="flex-1 py-3 rounded-xl font-bold text-sm bg-[color:var(--card-muted)] text-[color:var(--text-muted)]"
        >
          취소
        </button>
        <button
          disabled={pending || reflection.trim().length < 5}
          onClick={handleSubmit}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${
            pending || reflection.trim().length < 5
              ? "bg-[color:var(--card-muted)] text-[color:var(--text-subtle)]"
              : "bg-[color:var(--accent)] text-white"
          }`}
        >
          {pending ? "저장 중…" : "복기 저장"}
        </button>
      </div>
    </Card>
  );
}
