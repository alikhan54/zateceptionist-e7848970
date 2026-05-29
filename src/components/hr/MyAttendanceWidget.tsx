import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, MapPin } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface MyAttendanceWidgetProps {
  employeeId: string;
  tenantUuid: string;
}

/**
 * Personal punch-in/out card.
 *
 * "Currently working" = a row for this employee on today's date with a
 * check_in_time but no check_out_time. We don't introduce an
 * is_currently_active boolean because that would be a redundant denormalization
 * of the same fact, and harder to keep correct under concurrent updates.
 */
export function MyAttendanceWidget({ employeeId, tenantUuid }: MyAttendanceWidgetProps) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const [busy, setBusy] = useState(false);

  const { data: openSession, refetch } = useQuery({
    queryKey: ["my-open-session", employeeId, tenantUuid, today],
    queryFn: async () => {
      const { data } = await supabase
        .from("hr_attendance")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .eq("employee_id", employeeId)
        .eq("work_date", today)
        .is("check_out_time", null)
        .order("check_in_time", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    refetchInterval: 30_000,
  });

  const punchIn = async () => {
    setBusy(true);
    try {
      let location: any = null;
      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) return reject(new Error("no geolocation"));
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        location = { lat, lng, accuracy: pos.coords.accuracy };
      } catch {
        /* optional */
      }

      const { error } = await supabase.from("hr_attendance").insert({
        tenant_id: tenantUuid,
        employee_id: employeeId,
        work_date: today,
        check_in_time: new Date().toISOString(),
        check_in_location: location,
        check_in_latitude: lat,
        check_in_longitude: lng,
        status: "present",
        source: "web",
      } as any);

      if (error) throw error;
      toast.success("Punched in. Have a great day.");
      queryClient.invalidateQueries({ queryKey: ["my-open-session"] });
      queryClient.invalidateQueries({ queryKey: ["my-attendance-history"] });
      queryClient.invalidateQueries({ queryKey: ["who-is-working-now"] });
      refetch();
    } catch (e: any) {
      toast.error(`Punch-in failed: ${e?.message || "unknown"}`);
    } finally {
      setBusy(false);
    }
  };

  const punchOut = async () => {
    if (!openSession) return;
    setBusy(true);
    try {
      const checkInTs = new Date(openSession.check_in_time).getTime();
      const now = new Date();
      const minutes = Math.max(0, Math.round((now.getTime() - checkInTs) / 60_000));
      const workHours = +(minutes / 60).toFixed(2);

      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) return reject(new Error("no geolocation"));
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        /* optional */
      }

      const { error } = await supabase
        .from("hr_attendance")
        .update({
          check_out_time: now.toISOString(),
          check_out_latitude: lat,
          check_out_longitude: lng,
          work_hours: workHours,
          total_hours: workHours,
        } as any)
        .eq("id", openSession.id);
      if (error) throw error;

      const hh = Math.floor(minutes / 60);
      const mm = minutes % 60;
      toast.success(`Punched out. Worked ${hh}h ${mm}m today.`);
      queryClient.invalidateQueries({ queryKey: ["my-open-session"] });
      queryClient.invalidateQueries({ queryKey: ["my-attendance-history"] });
      queryClient.invalidateQueries({ queryKey: ["who-is-working-now"] });
      refetch();
    } catch (e: any) {
      toast.error(`Punch-out failed: ${e?.message || "unknown"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="p-6">
        {openSession ? (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 text-chart-2 mb-1">
                <span className="h-2 w-2 rounded-full bg-chart-2 animate-pulse" />
                <span className="text-sm font-medium">You're checked in</span>
              </div>
              <p className="text-2xl font-bold">
                <LiveDuration startTime={openSession.check_in_time} />
              </p>
              <p className="text-sm text-muted-foreground">
                Since {format(new Date(openSession.check_in_time), "h:mm a")}
              </p>
            </div>
            <Button size="lg" variant="destructive" onClick={punchOut} disabled={busy}>
              <LogOut className="h-5 w-5 mr-2" />
              {busy ? "Punching out…" : "Punch Out"}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Ready to start your day?</p>
              <p className="text-2xl font-bold">Click Punch In</p>
              <p className="text-sm text-muted-foreground">
                We'll record your hours and (with permission) your location.
              </p>
            </div>
            <Button size="lg" onClick={punchIn} disabled={busy}>
              <LogIn className="h-5 w-5 mr-2" />
              {busy ? "Punching in…" : "Punch In"}
              <MapPin className="h-4 w-4 ml-2 opacity-60" />
            </Button>
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
  return <span className="font-mono">{text || "0h 0m"}</span>;
}
