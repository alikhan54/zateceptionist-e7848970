import { Pill } from "lucide-react";
import OrderQueueView from "./OrderQueueView";
import { useHospitalT } from "./i18n";

export default function PharmacyQueue() {
  const { t } = useHospitalT();
  return <OrderQueueView type="medication" title={t("page.pharmacy.title")} eyebrow={t("page.pharmacy.eyebrow")} icon={Pill} actionLabel={t("page.pharmacy.action")} />;
}
