import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, AlarmClock } from "lucide-react";
import { toast } from "sonner";

const DEFAULTS = {
  auto_punch_out_enabled: false,
  auto_punch_out_time: "23:00",
  auto_punch_out_assume_duration_hours: 9,
  auto_punch_out_notes: "Auto punch-out (forgot to clock out)",
  expected_hours_per_day: 8,
  overtime_threshold_hours: 9,
  min_break_minutes: 30,
  grace_period_minutes: 15,
  late_punch_in_notification: true,
  geofence_enabled: false,
  office_latitude: null as number | null,
  office_longitude: null as number | null,
  geofence_radius_meters: 200,
  notify_admin_on_no_punch_out: true,
};

/**
 * Admin/manager-only settings card for attendance rules.
 *
 * Renders nothing when the user lacks admin/manager privileges so the page
 * stays clean for staff. Rules are read by both /my/attendance (so staff know
 * the punctuality grace period) and the auto-punch-out cron workflow.
 */
export function AttendanceRulesCard() {
  const { tenantConfig } = useTenant();
  const { isAdmin, isManager } = useAuth();
  const tenantUuid = tenantConfig?.id;
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const canEdit = isAdmin || isManager;

  const { data: rulesRow, isLoading } = useQuery({
    queryKey: ["hr-attendance-rules", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return null;
      const { data } = await supabase
        .from("hr_attendance_rules" as any)
        .select("*")
        .eq("tenant_id", tenantUuid)
        .maybeSingle();
      return data as any;
    },
    enabled: !!tenantUuid && canEdit,
  });

  const [form, setForm] = useState({ ...DEFAULTS });

  useEffect(() => {
    if (rulesRow) {
      setForm({
        auto_punch_out_enabled: !!rulesRow.auto_punch_out_enabled,
        auto_punch_out_time: rulesRow.auto_punch_out_time || DEFAULTS.auto_punch_out_time,
        auto_punch_out_assume_duration_hours: rulesRow.auto_punch_out_assume_duration_hours ?? DEFAULTS.auto_punch_out_assume_duration_hours,
        auto_punch_out_notes: rulesRow.auto_punch_out_notes || DEFAULTS.auto_punch_out_notes,
        expected_hours_per_day: rulesRow.expected_hours_per_day ?? DEFAULTS.expected_hours_per_day,
        overtime_threshold_hours: rulesRow.overtime_threshold_hours ?? DEFAULTS.overtime_threshold_hours,
        min_break_minutes: rulesRow.min_break_minutes ?? DEFAULTS.min_break_minutes,
        grace_period_minutes: rulesRow.grace_period_minutes ?? DEFAULTS.grace_period_minutes,
        late_punch_in_notification: !!rulesRow.late_punch_in_notification,
        geofence_enabled: !!rulesRow.geofence_enabled,
        office_latitude: rulesRow.office_latitude,
        office_longitude: rulesRow.office_longitude,
        geofence_radius_meters: rulesRow.geofence_radius_meters ?? DEFAULTS.geofence_radius_meters,
        notify_admin_on_no_punch_out: !!rulesRow.notify_admin_on_no_punch_out,
      });
    }
  }, [rulesRow]);

  if (!canEdit) return null;

  const save = async () => {
    if (!tenantUuid) return;
    setSaving(true);
    try {
      // Upsert by tenant_id (UNIQUE constraint guarantees one row per tenant)
      const payload: any = { ...form, tenant_id: tenantUuid };
      const { error } = await supabase
        .from("hr_attendance_rules" as any)
        .upsert(payload, { onConflict: "tenant_id" } as any);
      if (error) throw error;
      toast.success("Attendance rules saved");
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-rules", tenantUuid] });
    } catch (e: any) {
      toast.error(`Save failed: ${e?.message || "unknown"}`);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlarmClock className="h-5 w-5" />
              Attendance Rules
            </CardTitle>
            <CardDescription>
              Rules for {tenantConfig?.company_name || "this tenant"}. Applied to all staff.
            </CardDescription>
          </div>
          <Button onClick={save} disabled={saving} data-testid="attendance-rules-save">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving…" : "Save Rules"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto punch-out */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Auto Punch-Out</Label>
              <p className="text-xs text-muted-foreground">
                Automatically close open sessions if staff forgot to clock out
              </p>
            </div>
            <Switch
              checked={form.auto_punch_out_enabled}
              onCheckedChange={(v) => setForm({ ...form, auto_punch_out_enabled: v })}
              data-testid="auto-punch-out-toggle"
            />
          </div>
          {form.auto_punch_out_enabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pl-4 border-l-2 border-primary/20">
              <div>
                <Label className="text-xs">Punch-out time (tenant local)</Label>
                <Input
                  type="time"
                  value={form.auto_punch_out_time}
                  onChange={(e) => setForm({ ...form, auto_punch_out_time: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Assumed duration (hours)</Label>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={form.auto_punch_out_assume_duration_hours}
                  onChange={(e) => setForm({ ...form, auto_punch_out_assume_duration_hours: parseInt(e.target.value || "0") || 0 })}
                />
              </div>
              <div>
                <Label className="text-xs">Note added to session</Label>
                <Input
                  value={form.auto_punch_out_notes}
                  onChange={(e) => setForm({ ...form, auto_punch_out_notes: e.target.value })}
                />
              </div>
            </div>
          )}
        </section>

        {/* Work hours */}
        <section className="space-y-3">
          <Label className="text-base">Work Hours</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Expected hours/day</Label>
              <Input
                type="number"
                step="0.5"
                value={form.expected_hours_per_day}
                onChange={(e) => setForm({ ...form, expected_hours_per_day: parseFloat(e.target.value || "0") || 0 })}
              />
            </div>
            <div>
              <Label className="text-xs">Overtime threshold (hours)</Label>
              <Input
                type="number"
                step="0.5"
                value={form.overtime_threshold_hours}
                onChange={(e) => setForm({ ...form, overtime_threshold_hours: parseFloat(e.target.value || "0") || 0 })}
              />
            </div>
            <div>
              <Label className="text-xs">Min break (minutes)</Label>
              <Input
                type="number"
                value={form.min_break_minutes}
                onChange={(e) => setForm({ ...form, min_break_minutes: parseInt(e.target.value || "0") || 0 })}
              />
            </div>
          </div>
        </section>

        {/* Punctuality */}
        <section className="space-y-3">
          <Label className="text-base">Punctuality</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <div>
              <Label className="text-xs">Grace period (minutes)</Label>
              <Input
                type="number"
                value={form.grace_period_minutes}
                onChange={(e) => setForm({ ...form, grace_period_minutes: parseInt(e.target.value || "0") || 0 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Punch-ins within this window of the expected start are not flagged late.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.late_punch_in_notification}
                onCheckedChange={(v) => setForm({ ...form, late_punch_in_notification: v })}
              />
              <Label className="text-sm">Notify manager on late punch-in</Label>
            </div>
          </div>
        </section>

        {/* Geofence */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Geofencing</Label>
              <p className="text-xs text-muted-foreground">
                Require staff to be near the office to punch in
              </p>
            </div>
            <Switch
              checked={form.geofence_enabled}
              onCheckedChange={(v) => setForm({ ...form, geofence_enabled: v })}
            />
          </div>
          {form.geofence_enabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pl-4 border-l-2 border-primary/20">
              <div>
                <Label className="text-xs">Office latitude</Label>
                <Input
                  type="number"
                  step="0.00000001"
                  value={form.office_latitude ?? ""}
                  onChange={(e) => setForm({ ...form, office_latitude: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
              <div>
                <Label className="text-xs">Office longitude</Label>
                <Input
                  type="number"
                  step="0.00000001"
                  value={form.office_longitude ?? ""}
                  onChange={(e) => setForm({ ...form, office_longitude: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
              <div>
                <Label className="text-xs">Radius (meters)</Label>
                <Input
                  type="number"
                  value={form.geofence_radius_meters}
                  onChange={(e) => setForm({ ...form, geofence_radius_meters: parseInt(e.target.value || "0") || 0 })}
                />
              </div>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
