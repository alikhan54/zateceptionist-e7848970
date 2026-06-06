import { Pill } from "lucide-react";
import OrderQueueView from "./OrderQueueView";

export default function PharmacyQueue() {
  return <OrderQueueView type="medication" title="Pharmacy" eyebrow="Hospital · Pharmacy" icon={Pill} actionLabel="Dispense" />;
}
