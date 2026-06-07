import { FlaskConical } from "lucide-react";
import { HospitalGate } from "./hospitalShared";
import { LabReportPanel } from "./LabReportPanel";
import { OrderQueueInner } from "./OrderQueueView";
import { useHospitalOrders } from "@/hooks/useHospitalOrders";

// The Laboratory page (/hospital/lab) — the document-intelligence showpiece (LabReportPanel)
// as the hero, with the lab order worklist embedded below.
function LaboratoryInner() {
  const { orders } = useHospitalOrders({ orderType: "lab" });
  return (
    <div data-testid="hx-laboratory">
      <LabReportPanel labOrders={orders} />
      <div className="mt-4">
        <OrderQueueInner type="lab" title="Laboratory Worklist" eyebrow="Hospital · Laboratory" icon={FlaskConical} actionLabel="Mark resulted" embedded />
      </div>
    </div>
  );
}

export default function Laboratory() {
  return <HospitalGate><LaboratoryInner /></HospitalGate>;
}
