import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { instruments, priceHistory, fxRates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchQuote, fetchDailyHistory, yahooTickerFor } from "@/lib/prices";

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
  const since = new Date(Date.now() - 95 * 86400000);

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

  // USD_KRW 환율
  try {
    const fx = await fetchQuote("KRW=X");
    if (fx) {
      await db
        .insert(fxRates)
        .values({
          pair: "USD_KRW",
          rate: fx.price,
          updatedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: fxRates.pair,
          set: { rate: fx.price, updatedAt: new Date().toISOString() },
        });
    }
  } catch {}

  return NextResponse.json({
    updated: results.filter((r) => r.status === "ok").length,
    total: results.length,
    results,
  });
}
