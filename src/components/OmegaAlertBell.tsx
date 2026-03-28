import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, AlertTriangle, Info, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

const SEVERITY_CONFIG = {
  critical: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
};

export function OmegaAlertBell() {
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: alerts = [] } = useQuery({
    queryKey: ["omega-alerts", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("omega_alerts")
        .select("id,alert_type,severity,title,message,category,created_at,action_url,action_label")
        .eq("tenant_id", tenantId!)
        .eq("is_read", false)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!tenantId,
    refetchInterval: 60000,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase
        .from("omega_alerts")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("tenant_id", tenantId!)
        .eq("is_read", false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["omega-alerts"] }),
  });

  const unreadCount = alerts.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center px-1">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">OMEGA Alerts</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => markAllRead.mutate()}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mb-2 text-green-500" />
              <p className="text-sm">All clear</p>
            </div>
          ) : (
            alerts.map((alert: any) => {
              const sev = SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.info;
              const Icon = sev.icon;
              return (
                <div key={alert.id} className={cn("px-4 py-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer", sev.bg)}
                  onClick={() => { if (alert.action_url) navigate(alert.action_url); setOpen(false); }}>
                  <div className="flex items-start gap-2">
                    <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", sev.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="px-4 py-2 border-t">
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { navigate("/omega/alerts"); setOpen(false); }}>
            View all alerts
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
