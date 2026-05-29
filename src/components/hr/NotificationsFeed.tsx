import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, BellRing, CheckCheck, ExternalLink, Info, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

// Read-only-ish feed over the hr_notifications base table, scoped to the
// caller's tenant UUID (tenantConfig.id). recipient_id has no FK in the schema
// and the table ships empty; this component treats it as the auth user id
// (auth.users.id) — the standard "in-app inbox" interpretation. The matching
// RLS activation policy (docs/.hr-rls-activation.sql) uses recipient_id = auth.uid(),
// so this assumption and the post-merge policy stay in lockstep.
//
// Reads degrade quietly to an empty list when RLS blocks the browser role, so
// the feed never crashes. hr_notifications currently has RLS enabled + 0 browser
// policies (deny-all) → empty state is the expected, honest outcome until the
// activation SQL is applied.
interface HrNotification {
  id: string;
  tenant_id: string;
  recipient_id: string;
  title: string;
  message: string | null;
  type: string | null;
  category: string | null;
  is_read: boolean | null;
  read_at: string | null;
  action_url: string | null;
  sent_at: string | null;
  created_at: string | null;
}

type Scope = "mine" | "all";

function typeMeta(type: string | null): { Icon: typeof Info; cls: string } {
  switch ((type || "info").toLowerCase()) {
    case "success":
      return { Icon: CheckCircle2, cls: "text-chart-2" };
    case "warning":
      return { Icon: AlertTriangle, cls: "text-yellow-500" };
    case "error":
    case "alert":
      return { Icon: XCircle, cls: "text-destructive" };
    default:
      return { Icon: Info, cls: "text-primary" };
  }
}

function prettyWhen(ts: string | null): string {
  if (!ts) return "";
  try {
    return formatDistanceToNow(parseISO(ts), { addSuffix: true });
  } catch {
    return ts;
  }
}

export function NotificationsFeed({ scope = "mine" }: { scope?: Scope }) {
  const { tenantConfig } = useTenant();
  const { user } = useAuth();
  const tenantUuid = tenantConfig?.id;
  const userId = user?.id;
  const queryClient = useQueryClient();

  const queryKey = ["hr-notifications", tenantUuid, scope, scope === "mine" ? userId : "all"];

  const { data: notifications = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!tenantUuid) return [] as HrNotification[];
      if (scope === "mine" && !userId) return [] as HrNotification[];
      let q = supabase
        .from("hr_notifications")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .order("created_at", { ascending: false })
        .limit(50);
      if (scope === "mine" && userId) q = q.eq("recipient_id", userId);
      const { data, error } = await q;
      if (error) return [] as HrNotification[]; // RLS may block the browser role; degrade quietly
      return (data || []) as HrNotification[];
    },
    enabled: !!tenantUuid && (scope === "all" || !!userId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantUuid) throw new Error("No tenant context");
      const { error } = await supabase
        .from("hr_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantUuid);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message || "Failed to mark as read"),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!tenantUuid) throw new Error("No tenant context");
      let q = supabase
        .from("hr_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("tenant_id", tenantUuid)
        .eq("is_read", false);
      if (scope === "mine" && userId) q = q.eq("recipient_id", userId);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All notifications marked as read");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to mark all as read"),
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {unreadCount > 0 ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
              Notifications
              {unreadCount > 0 && (
                <Badge variant="default" className="ml-1">
                  {unreadCount} new
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {scope === "all"
                ? "All HR notifications across your organization"
                : "Updates and alerts addressed to you"}
            </CardDescription>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-10">
            <Bell className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">You're all caught up</p>
            <p className="text-sm text-muted-foreground">No notifications to show</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const { Icon, cls } = typeMeta(n.type);
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 rounded-md border p-3 transition-colors ${
                    n.is_read ? "bg-background" : "bg-muted/40 border-primary/30"
                  }`}
                >
                  <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${cls}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm ${n.is_read ? "font-medium" : "font-semibold"}`}>{n.title}</p>
                      {n.category && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {n.category}
                        </Badge>
                      )}
                      {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary" aria-label="unread" />}
                    </div>
                    {n.message && <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">{prettyWhen(n.created_at || n.sent_at)}</span>
                      {n.action_url && (
                        <a
                          href={n.action_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  {!n.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-xs"
                      onClick={() => markRead.mutate(n.id)}
                      disabled={markRead.isPending}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default NotificationsFeed;
