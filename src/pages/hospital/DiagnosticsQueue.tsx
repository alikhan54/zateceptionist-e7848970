import { ScanLine } from "lucide-react";
import OrderQueueView from "./OrderQueueView";
import { useHospitalT } from "./i18n";

export default function DiagnosticsQueue() {
  const { t } = useHospitalT();
  return <OrderQueueView type="imaging" title={t("page.diagnostics.title")} eyebrow={t("page.diagnostics.eyebrow")} icon={ScanLine} actionLabel={t("page.diagnostics.action")} />;
}
