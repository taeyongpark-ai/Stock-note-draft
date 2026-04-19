import { NextRequest, NextResponse } from "next/server";
import { searchTickers } from "@/lib/prices";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ hits: [] });
  }
  const hits = await searchTickers(q);
  return NextResponse.json({ hits });
}
