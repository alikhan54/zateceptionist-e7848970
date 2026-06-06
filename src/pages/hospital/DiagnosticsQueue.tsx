import { ScanLine } from "lucide-react";
import OrderQueueView from "./OrderQueueView";

export default function DiagnosticsQueue() {
  return <OrderQueueView type="imaging" title="Diagnostics & Imaging" eyebrow="Hospital · Radiology" icon={ScanLine} actionLabel="Mark resulted" />;
}
