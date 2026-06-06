import { FlaskConical } from "lucide-react";
import OrderQueueView from "./OrderQueueView";

export default function LabQueue() {
  return <OrderQueueView type="lab" title="Laboratory" eyebrow="Hospital · Laboratory" icon={FlaskConical} actionLabel="Mark resulted" />;
}
