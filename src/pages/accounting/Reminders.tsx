import { Bell } from "lucide-react";
import ComingSoon from "./ComingSoon";

export default function AccountingReminders() {
  return (
    <ComingSoon
      icon={Bell}
      title="Smart Reminders"
      description="Auto-send polite reminders via Email/WhatsApp/SMS — UK business hours aware (9–6 Mon–Fri, skips bank holidays)."
      features={[
        "9–6 UK business-hours sending window",
        "Mon–Fri only (no weekend pings)",
        "Bank holidays aware (gov.uk feed, auto-refreshed)",
        "Multi-channel routing: Email / WhatsApp / SMS",
        "Adjustable tone: gentle / firm / final",
      ]}
    />
  );
}
