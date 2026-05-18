import { FileText } from "lucide-react";
import ComingSoon from "./ComingSoon";

export default function AccountingInvoices() {
  return (
    <ComingSoon
      icon={FileText}
      title="Invoice Management"
      description="Create, send, and track UK-VAT-compliant invoices with auto-matching to bank transactions."
      features={[
        "UK VAT-compliant invoice templates",
        "Auto bank-transaction matching (TrueLayer)",
        "Reminder automation (overdue cadence)",
        "Payment tracking + part-payment support",
        "PDF export + email send",
      ]}
    />
  );
}
