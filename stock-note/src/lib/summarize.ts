/**
 * OpenAI GPT-4o-mini로 이벤트 요약 생성.
 *
 * 안전장치:
 * - max_tokens 1500 강제
 * - 모델: gpt-4o-mini (저렴)
 * - 일일 소프트 캡 ($1) 초과 시 throw
 * - 호출마다 llm_usage 테이블에 토큰/비용 누적
 */

import OpenAI from "openai";
import { db } from "@/db/client";
import { llmUsage } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import type { NewsSnippet } from "./news";

// GPT-4o-mini 요금 (2025 기준)
const PRICE_INPUT_PER_1M = 0.15;
const PRICE_OUTPUT_PER_1M = 0.6;

// 일일 소프트 캡 (USD)
const DAILY_COST_CAP = 1.0;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type SummarizedNews = {
  headline: string;
  source: string;
  url?: string;
  category: "STOCK" | "FX" | "COMMODITY" | "MACRO" | "SECTOR";
  impact: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
};

export type EventSummary = {
  summary: string; // 한 줄 요약
  news: SummarizedNews[];
};

function kstDate(): string {
  // KST (UTC+9) 오늘 날짜 YYYY-MM-DD
  const d = new Date(Date.now() + 9 * 3600_000);
  return d.toISOString().slice(0, 10);
}

/** 오늘 누적 비용이 소프트 캡을 넘었는지 확인 */
export async function isDailyCapReached(): Promise<boolean> {
  const today = kstDate();
  const rows = await db.select().from(llmUsage).where(eq(llmUsage.date, today));
  return (rows[0]?.costUsd ?? 0) >= DAILY_COST_CAP;
}

/** llm_usage 테이블에 사용량 누적 */
async function logUsage(inputTokens: number, outputTokens: number) {
  const today = kstDate();
  const cost =
    (inputTokens / 1_000_000) * PRICE_INPUT_PER_1M +
    (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_1M;
  const now = new Date().toISOString();
  await db
    .insert(llmUsage)
    .values({
      date: today,
      inputTokens,
      outputTokens,
      costUsd: cost,
      calls: 1,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: llmUsage.date,
      set: {
        inputTokens: sql`${llmUsage.inputTokens} + ${inputTokens}`,
        outputTokens: sql`${llmUsage.outputTokens} + ${outputTokens}`,
        costUsd: sql`${llmUsage.costUsd} + ${cost}`,
        calls: sql`${llmUsage.calls} + 1`,
        updatedAt: now,
      },
    });
}

/**
 * 한 이벤트(종목 특정일 3%+ 등락)에 대해 뉴스 요약 생성.
 * 실패(캡/API 오류) 시 null 반환.
 */
export async function summarizeEvent(args: {
  instrumentName: string;
  symbol: string;
  date: string; // YYYY-MM-DD
  dayChangePct: number;
  news: NewsSnippet[];
}): Promise<EventSummary | null> {
  if (args.news.length === 0) return null;
  if (await isDailyCapReached()) {
    console.warn("[summarizeEvent] daily cost cap reached, skipping");
    return null;
  }

  const pctStr = (args.dayChangePct * 100).toFixed(2);
  const sign = args.dayChangePct >= 0 ? "+" : "";
  const newsBlock = args.news
    .slice(0, 8)
    .map((n, i) => `${i + 1}. [${n.source}] ${n.headline}`)
    .join("\n");

  const prompt = `종목: ${args.instrumentName} (${args.symbol})
날짜: ${args.date}
등락률: ${sign}${pctStr}%

해당 일자 전후의 관련 뉴스/포스트:
${newsBlock}

위 뉴스를 바탕으로 한국어로 간결하게 요약해주세요. 반드시 JSON으로만 응답하세요.
형식:
{
  "summary": "한 문장 요약 (60자 이내). 왜 이 등락이 발생했는지 핵심 원인.",
  "news": [
    {
      "headline": "원본 헤드라인 (한국어로 간결히 다듬어도 됨)",
      "source": "출처",
      "url": "원본 URL (있으면)",
      "category": "STOCK | FX | COMMODITY | MACRO | SECTOR 중 하나",
      "impact": "POSITIVE | NEGATIVE | NEUTRAL 중 하나"
    }
  ]
}

규칙:
- news 배열은 최대 5개
- category는 영문 대문자로
- impact는 종목 관점에서의 영향 (주가 상승 요인이면 POSITIVE)`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "당신은 주식 뉴스를 간결하게 요약하는 금융 애널리스트입니다. 반드시 JSON으로만 응답합니다.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
      temperature: 0.3,
    });

    const inputTokens = completion.usage?.prompt_tokens ?? 0;
    const outputTokens = completion.usage?.completion_tokens ?? 0;
    await logUsage(inputTokens, outputTokens);

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as EventSummary;
    // 최소 방어
    if (!parsed.summary || !Array.isArray(parsed.news)) return null;
    return {
      summary: parsed.summary.slice(0, 120),
      news: parsed.news.slice(0, 5).map((n) => ({
        headline: n.headline ?? "",
        source: n.source ?? "",
        url: n.url,
        category: (["STOCK", "FX", "COMMODITY", "MACRO", "SECTOR"] as const).includes(
          n.category as never
        )
          ? n.category
          : "STOCK",
        impact: (["POSITIVE", "NEGATIVE", "NEUTRAL"] as const).includes(
          n.impact as never
        )
          ? n.impact
          : "NEUTRAL",
      })),
    };
  } catch (e) {
    console.error("[summarizeEvent] OpenAI error:", e);
    return null;
  }
}
