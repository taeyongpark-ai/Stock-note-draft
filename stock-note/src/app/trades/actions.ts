"use server";

import { db } from "@/db/client";
import { trades, reviews } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTrade(data: {
  instrumentId: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  executedAt: string;
  thesis: string;
  confidence: number;
  tags: string[];
  fxToKrw?: number;
}) {
  const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  await db.insert(trades).values({ id, fee: 0, ...data });
  revalidatePath("/trades");
  redirect(`/trades/${id}`);
}

export async function addReview(
  tradeId: string,
  data: {
    verdict: "GOOD" | "NEUTRAL" | "BAD";
    reflection: string;
    counterfactualPrice?: number;
    counterfactualAt?: string;
  }
) {
  await db
    .insert(reviews)
    .values({ tradeId, reviewedAt: new Date().toISOString(), ...data })
    .onConflictDoUpdate({
      target: reviews.tradeId,
      set: { reviewedAt: new Date().toISOString(), ...data },
    });
  revalidatePath(`/trades/${tradeId}`);
  revalidatePath("/trades");
}
