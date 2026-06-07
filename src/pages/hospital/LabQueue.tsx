import { FlaskConical } from "lucide-react";
import OrderQueueView from "./OrderQueueView";
import { useHospitalT } from "./i18n";

export default function LabQueue() {
  const { t } = useHospitalT();
  return <OrderQueueView type="lab" title={t("page.labq.title")} eyebrow={t("page.lab.eyebrow")} icon={FlaskConical} actionLabel={t("page.lab.action")} />;
}
