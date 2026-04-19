"use server";

import { db } from "@/db/client";
import { watchlist, instruments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { fetchQuote, type SearchHit } from "@/lib/prices";

export async function addWatchlist(instrumentId: string) {
  await db
    .insert(watchlist)
    .values({
      instrumentId,
      addedAt: new Date().toISOString(),
    })
    .onConflictDoNothing();
  revalidatePath("/trend");
}

export async function removeWatchlist(instrumentId: string) {
  await db.delete(watchlist).where(eq(watchlist.instrumentId, instrumentId));
  revalidatePath("/trend");
}

/** Yahoo 검색 결과로부터 instruments에 insert 후 관심 등록 */
export async function addWatchlistFromSearch(hit: SearchHit) {
  const id = `i-${hit.symbol.toLowerCase()}`;
  // 현재가 한 번 가져와서 instruments에 저장 (없으면 0)
  const quote = await fetchQuote(hit.yahooTicker);
  await db
    .insert(instruments)
    .values({
      id,
      symbol: hit.symbol,
      name: hit.name,
      market: hit.market,
      currency: hit.currency,
      color: "#94A3B8",
      currentPrice: quote?.price ?? 0,
      dayChange: quote?.dayChangePct ?? 0,
    })
    .onConflictDoNothing();

  await db
    .insert(watchlist)
    .values({ instrumentId: id, addedAt: new Date().toISOString() })
    .onConflictDoNothing();
  revalidatePath("/trend");
}
