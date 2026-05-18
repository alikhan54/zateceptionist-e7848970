import { Briefcase } from "lucide-react";
import ComingSoon from "./ComingSoon";

export default function AccountingJobs() {
  return (
    <ComingSoon
      icon={Briefcase}
      title="Jobs Pipeline"
      description="Track all client work — VAT returns, year-end accounts, tax filings — with deadlines, status, and team assignments."
      features={[
        "Automatic deadline tracking against UK accounting cycle",
        "Status workflow: backlog → in progress → review → done",
        "Team assignments per job",
        "Priority management (urgent / high / medium / low)",
        "UK-aware HMRC + Companies House deadline templates",
      ]}
    />
  );
}
