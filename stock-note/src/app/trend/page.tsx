export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import Logo from "@/components/ui/Logo";
import TopTabs from "@/components/shell/TopTabs";
import AddWatchlistButton from "@/components/watchlist/AddWatchlistButton";
import {
  getAllInstruments,
  getWatchlistInstruments,
  getPortfolio,
} from "@/db/queries";
import type { InferSelectModel } from "drizzle-orm";
import type { instruments } from "@/db/schema";
import { formatPct, deltaClass, deltaArrow } from "@/lib/format";

type Instrument = InferSelectModel<typeof instruments>;

function priceLabel(it: Instrument): string {
  if (it.currency === "KRW") {
    return `${it.currentPrice.toLocaleString("ko-KR")}원`;
  }
  if (it.currency === "USD") {
    return `$${it.currentPrice.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `${it.currentPrice.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })} ${it.currency}`;
}

function Row({ it }: { it: Instrument }) {
  return (
    <Link
      href={`/trend/${it.id}`}
      className="flex items-center gap-3 px-5 py-3.5 border-b border-[color:var(--border)] last:border-b-0"
    >
      <Logo name={it.name} color={it.color} size={40} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[15px] truncate">{it.name}</div>
        <div className="text-xs text-[color:var(--text-muted)] mt-0.5">
          {it.market} · {it.symbol}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[15px] font-bold tabular">{priceLabel(it)}</div>
        <div
          className={`text-[13px] font-semibold tabular ${deltaClass(
            it.dayChange
          )}`}
        >
          {deltaArrow(it.dayChange)} {formatPct(it.dayChange)}
        </div>
      </div>
    </Link>
  );
}

export default async function TrendPage() {
  const [{ positions }, watchInstruments, allInstruments] = await Promise.all([
    getPortfolio(),
    getWatchlistInstruments(),
    getAllInstruments(),
  ]);
  const holdingInstruments = positions.map((p) => p.instrument);
  const existingIds = watchInstruments.map((i) => i.id);

  return (
    <div className="space-y-4 pt-2">
      <TopTabs />

      <Card className="py-1">
        <div className="px-5 pt-4 pb-2 text-[15px] font-bold">
          내 보유 종목
          <span className="text-[color:var(--text-subtle)] font-normal ml-1.5 text-xs tabular">
            {holdingInstruments.length}
          </span>
        </div>
        {holdingInstruments.length === 0 ? (
          <div className="px-5 py-8 text-sm text-[color:var(--text-muted)] text-center">
            보유 종목이 아직 없어요.
          </div>
        ) : (
          <div>
            {holdingInstruments.map((it) => (
              <Row key={it.id} it={it} />
            ))}
          </div>
        )}
      </Card>

      <Card className="py-1">
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div className="text-[15px] font-bold">
            관심 종목
            <span className="text-[color:var(--text-subtle)] font-normal ml-1.5 text-xs tabular">
              {watchInstruments.length}
            </span>
          </div>
          <AddWatchlistButton
            allInstruments={allInstruments}
            existingIds={existingIds}
          />
        </div>
        {watchInstruments.length === 0 ? (
          <div className="px-5 py-8 text-sm text-[color:var(--text-muted)] text-center">
            관심 종목이 아직 없어요.
          </div>
        ) : (
          <div>
            {watchInstruments.map((it) => (
              <Row key={it.id} it={it} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
