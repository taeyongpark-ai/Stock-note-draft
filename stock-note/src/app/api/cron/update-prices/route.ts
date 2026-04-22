import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { instruments, priceHistory, fxRates, marketIndices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchQuote, fetchDailyHistory, yahooTickerFor } from "@/lib/prices";
import { processEvent, EVENT_THRESHOLD } from "@/lib/detect-events";
import { isDailyCapReached } from "@/lib/summarize";
import { watchlist, trades as tradesTable } from "@/db/schema";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * 모든 instruments의 현재가/등락률을 갱신하고, 최근 90일 일봉을 price_history에 upsert.
 * USD_KRW 환율도 fx_rates에 저장.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const allInstruments = await db.select().from(instruments);
  const historyFromParam = req.nextUrl.searchParams.get("historyFrom");
  const since = historyFromParam
    ? new Date(historyFromParam)
    : new Date(Date.now() - 95 * 86400000);

  // 병렬 fetch — 동시에 여러 종목 처리
  const results = await Promise.all(
    allInstruments.map(async (inst) => {
      const ticker = yahooTickerFor(inst);
      try {
        const [quote, hist] = await Promise.all([
          fetchQuote(ticker),
          fetchDailyHistory(ticker, since),
        ]);

        if (!quote) {
          return { id: inst.id, status: "no-quote" as const };
        }

        await db
          .update(instruments)
          .set({ currentPrice: quote.price, dayChange: quote.dayChangePct })
          .where(eq(instruments.id, inst.id));

        // 일봉 upsert (병렬)
        await Promise.all(
          hist.map((bar) =>
            db
              .insert(priceHistory)
              .values({
                instrumentId: inst.id,
                date: bar.date,
                open: bar.open,
                high: bar.high,
                low: bar.low,
                close: bar.close,
                volume: bar.volume,
              })
              .onConflictDoUpdate({
                target: [priceHistory.instrumentId, priceHistory.date],
                set: {
                  open: bar.open,
                  high: bar.high,
                  low: bar.low,
                  close: bar.close,
                  volume: bar.volume,
                },
              })
          )
        );

        return {
          id: inst.id,
          status: "ok" as const,
          price: quote.price,
          bars: hist.length,
        };
      } catch (e) {
        return {
          id: inst.id,
          status: "error" as const,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    })
  );

  // 시장 지수 갱신 (KOSPI, KOSDAQ, SPX, USDKRW 등)
  const indices = await db.select().from(marketIndices);
  const indexResults = await Promise.all(
    indices.map(async (idx) => {
      try {
        const [quote, hist] = await Promise.all([
          fetchQuote(idx.yahooTicker),
          fetchDailyHistory(idx.yahooTicker, new Date(Date.now() - 35 * 86400000)),
        ]);
        if (!quote) return { code: idx.code, status: "no-quote" as const };
        const sparkline = hist.slice(-30).map((b) => b.close);
        await db
          .update(marketIndices)
          .set({
            value: quote.price,
            dayChange: quote.dayChangePct,
            sparklinePoints: sparkline,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(marketIndices.code, idx.code));
        return { code: idx.code, status: "ok" as const, value: quote.price };
      } catch (e) {
        return {
          code: idx.code,
          status: "error" as const,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    })
  );

  // USD_KRW 환율 (fx_rates — 포트폴리오 계산용)
  const usdKrwRow = indexResults.find((r) => r.code === "USDKRW" && r.status === "ok");
  if (usdKrwRow && "value" in usdKrwRow) {
    await db
      .insert(fxRates)
      .values({
        pair: "USD_KRW",
        rate: usdKrwRow.value!,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: fxRates.pair,
        set: { rate: usdKrwRow.value!, updatedAt: new Date().toISOString() },
      });
  }

  // 3% 이상 등락 자동 감지 (관심+보유 종목만) → 이벤트 + 뉴스 + LLM 요약
  const today = new Date().toISOString().slice(0, 10);
  const [watched, tradedRows] = await Promise.all([
    db.select().from(watchlist),
    db.select({ id: tradesTable.instrumentId }).from(tradesTable),
  ]);
  const targetIds = new Set<string>();
  watched.forEach((w) => targetIds.add(w.instrumentId));
  tradedRows.forEach((r) => targetIds.add(r.id));

  const eventResults: Array<{ id: string; status: string; news?: number }> = [];
  for (const inst of allInstruments) {
    if (!targetIds.has(inst.id)) continue;
    if (Math.abs(inst.dayChange) < EVENT_THRESHOLD) continue;
    if (await isDailyCapReached()) {
      eventResults.push({ id: inst.id, status: "daily-cap-reached" });
      break;
    }
    const r = await processEvent(inst, today, inst.dayChange);
    eventResults.push({
      id: inst.id,
      status: r.ok ? "ok" : r.skipped ?? "unknown",
      news: r.news,
    });
  }

  return NextResponse.json({
    instruments: {
      updated: results.filter((r) => r.status === "ok").length,
      total: results.length,
      results,
    },
    indices: {
      updated: indexResults.filter((r) => r.status === "ok").length,
      total: indexResults.length,
      results: indexResults,
    },
    events: {
      new: eventResults.filter((r) => r.status === "ok").length,
      results: eventResults,
    },
  });
}
