import { FlaskConical } from "lucide-react";
import { HospitalGate } from "./hospitalShared";
import { LabReportPanel } from "./LabReportPanel";
import { OrderQueueInner } from "./OrderQueueView";
import { useHospitalT } from "./i18n";
import { useHospitalOrders } from "@/hooks/useHospitalOrders";

// The Laboratory page (/hospital/lab) — the document-intelligence showpiece (LabReportPanel)
// as the hero, with the lab order worklist embedded below.
function LaboratoryInner() {
  const { t } = useHospitalT();
  const { orders } = useHospitalOrders({ orderType: "lab" });
  return (
    <div data-testid="hx-laboratory">
      <LabReportPanel labOrders={orders} />
      <div className="mt-4">
        <OrderQueueInner type="lab" title={t("page.lab.title")} eyebrow={t("page.lab.eyebrow")} icon={FlaskConical} actionLabel={t("page.lab.action")} embedded />
      </div>
    </div>
  );
}

export default function Laboratory() {
  return <HospitalGate allow={["doctor", "lab", "admin"]}><LaboratoryInner /></HospitalGate>;
}
