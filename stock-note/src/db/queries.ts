import { db } from "./client";
import { instruments, watchlist } from "./schema";
import { eq } from "drizzle-orm";

/** 전체 종목 목록 (관심 추가 모달 검색용) */
export async function getAllInstruments() {
  return db.select().from(instruments);
}

/** 관심 종목에 등록된 instrument 객체 배열 */
export async function getWatchlistInstruments() {
  const rows = await db
    .select({ instrument: instruments })
    .from(watchlist)
    .innerJoin(instruments, eq(watchlist.instrumentId, instruments.id));
  return rows.map((r) => r.instrument);
}
