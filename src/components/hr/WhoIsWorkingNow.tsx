import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

/**
 * Live "who's working right now" dashboard widget.
 *
 * Working-now = today's hr_attendance rows with check_in_time set and
 * check_out_time NULL. No new is_currently_active boolean — that would
 * just denormalize the existing fact and drift under concurrent updates.
 *
 * Refresh: react-query polls every 30s. We also subscribe to realtime
 * INSERT/UPDATE on hr_attendance so a punch-in/punch-out from any other
 * tab refreshes instantly.
 */
export function WhoIsWorkingNow() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const today = new Date().toISOString().split("T")[0];

  const liveQuery = useQuery({
    queryKey: ["who-is-working-now", tenantUuid, today],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data } = await supabase
        .from("hr_attendance")
        .select(
          `id, employee_id, check_in_time, check_in_location, status,
           employee:hr_employees(id, first_name, last_name, position, department, profile_picture)`
        )
        .eq("tenant_id", tenantUuid)
        .eq("work_date", today)
        .is("check_out_time", null)
        .order("check_in_time", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!tenantUuid,
    refetchInterval: 30_000,
  });

  const totalActiveQuery = useQuery({
    queryKey: ["total-active-staff", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return 0;
      const { count } = await supabase
        .from("hr_employees")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantUuid)
        .or("employment_status.eq.active,employment_status.is.null");
      return count || 0;
    },
    enabled: !!tenantUuid,
  });

  useEffect(() => {
    if (!tenantUuid) return;
    const channel = supabase
      .channel(`hr_attendance_live_${tenantUuid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hr_attendance", filter: `tenant_id=eq.${tenantUuid}` },
        () => {
          liveQuery.refetch();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantUuid, liveQuery]);

  const sessions = liveQuery.data || [];
  const total = totalActiveQuery.data || 0;
  const percent = total > 0 ? Math.round((sessions.length / total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="relative inline-block h-2.5 w-2.5">
                <span className="absolute inset-0 rounded-full bg-chart-2 animate-ping opacity-75" />
                <span className="absolute inset-0 rounded-full bg-chart-2" />
              </span>
              Working Now
            </CardTitle>
            <CardDescription>
              {sessions.length} of {total} staff currently checked in
            </CardDescription>
          </div>
          <Badge variant="outline">{percent}%</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {liveQuery.isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No one is currently checked in
          </p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {sessions.map((s: any) => {
              const emp = s.employee;
              const initials =
                emp ? `${(emp.first_name || "")[0] || ""}${(emp.last_name || "")[0] || ""}`.toUpperCase() : "?";
              const name = emp
                ? `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "Employee"
                : "Employee";
              return (
                <div key={s.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-chart-2 ring-2 ring-background" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {emp?.position || "—"}
                        {emp?.department ? ` · ${emp.department}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono">
                      <LiveDuration startTime={s.check_in_time} />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      since {format(new Date(s.check_in_time), "h:mm a")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LiveDuration({ startTime }: { startTime: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const tick = () => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const minutes = Math.max(0, Math.floor((now - start) / 60_000));
      const hh = Math.floor(minutes / 60);
      const mm = minutes % 60;
      setText(`${hh}h ${mm}m`);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [startTime]);
  return <>{text || "0h 0m"}</>;
}
