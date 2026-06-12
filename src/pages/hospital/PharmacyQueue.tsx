import { Pill } from "lucide-react";
import { OrderQueueInner } from "./OrderQueueView";
import { HospitalGate } from "./hospitalShared";
import { PharmacyPos } from "./HospitalPos";
import { useHospitalT } from "./i18n";

// [Brief 11] composes the UNCHANGED dispense queue + the thin POS under ONE gate (the same
// allow-list the page always had — OrderQueueView itself is untouched for Lab/Diagnostics).
export default function PharmacyQueue() {
  const { t } = useHospitalT();
  return (
    <HospitalGate allow={["doctor", "admin"]}>
      <OrderQueueInner type="medication" title={t("page.pharmacy.title")} eyebrow={t("page.pharmacy.eyebrow")} icon={Pill} actionLabel={t("page.pharmacy.action")} />
      <PharmacyPos />
    </HospitalGate>
  );
}
