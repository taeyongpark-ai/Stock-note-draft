import TopTabs from "@/components/shell/TopTabs";
import TradeList from "./TradeList";
import { getAllTrades } from "@/db/queries";

export default async function TradesPage() {
  const rows = await getAllTrades();

  return (
    <div className="space-y-4 pt-2">
      <TopTabs />
      <TradeList rows={rows} />
    </div>
  );
}
