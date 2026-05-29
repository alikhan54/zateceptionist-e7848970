import { Navigate } from "react-router-dom";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { NotificationsFeed } from "@/components/hr/NotificationsFeed";
import { Bell } from "lucide-react";

// Admin-facing org-wide notifications view (scope="all"). The same
// NotificationsFeed component powers the per-user "Alerts" tab in /my.
export default function HrNotificationsPage() {
  const { isEnabled } = useFeatureFlags();
  if (!isEnabled("hr_module")) {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Bell className="h-8 w-8 text-primary" />
          Notifications
        </h1>
        <p className="text-muted-foreground mt-1">Organization-wide HR notifications and alerts</p>
      </div>
      <NotificationsFeed scope="all" />
    </div>
  );
}
