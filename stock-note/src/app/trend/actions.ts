"use server";

import { db } from "@/db/client";
import { watchlist } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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
