import { DollarSign } from "lucide-react";
import ComingSoon from "./ComingSoon";

export default function AccountingFinance() {
  return (
    <ComingSoon
      icon={DollarSign}
      title="Financial Overview"
      description="Live cash position, revenue trends, top clients, overdue totals — all in one dashboard."
      features={[
        "Live cash position (across linked bank accounts)",
        "MRR / ARR tracking by client",
        "Top clients by revenue",
        "Overdue invoice aging buckets (1-30 / 31-60 / 61-90 / 90+)",
        "Monthly trend charts (revenue / expenses / margin)",
      ]}
    />
  );
}
