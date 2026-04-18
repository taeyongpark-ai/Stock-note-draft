import { getAllInstruments } from "@/db/queries";
import TradeForm from "./TradeForm";

export default async function NewTradePage() {
  const allInstruments = await getAllInstruments();
  return <TradeForm allInstruments={allInstruments} />;
}
