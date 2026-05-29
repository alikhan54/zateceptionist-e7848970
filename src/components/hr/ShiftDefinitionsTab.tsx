import { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, CheckCircle2, XCircle, Clock, Star } from "lucide-react";

// CRUD over the hr_shifts base table, scoped to the caller's tenant UUID
// (tenantConfig.id) for parity with the rest of the HR data layer. Reads degrade
// quietly to an empty list if RLS blocks the browser role, so the tab never crashes.
//
// hr_shifts currently has RLS enabled + 0 browser policies (deny-all) → the empty
// state is the expected, honest outcome until the activation SQL is applied.
interface HrShift {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  start_time: string;
  end_time: string;
  break_duration_minutes: number | null;
  grace_period_minutes: number | null;
  overtime_threshold_hours: number | null;
  is_default: boolean | null;
  is_active: boolean | null;
  created_at: string | null;
}

interface ShiftForm {
  name: string;
  code: string;
  start_time: string;
  end_time: string;
  break_duration_minutes: string;
  grace_period_minutes: string;
  overtime_threshold_hours: string;
  is_default: boolean;
  is_active: boolean;
}

const EMPTY_FORM: ShiftForm = {
  name: "",
  code: "",
  start_time: "09:00",
  end_time: "17:00",
  break_duration_minutes: "60",
  grace_period_minutes: "15",
  overtime_threshold_hours: "8",
  is_default: false,
  is_active: true,
};

// time columns come back as HH:MM:SS; the <input type="time"> wants HH:MM
function hhmm(t: string | null | undefined): string {
  if (!t) return "";
  return t.slice(0, 5);
}

export function ShiftDefinitionsTab() {
  const { tenantConfig } = useTenant();
  const { isAdmin, isManager } = useAuth();
  const tenantUuid = tenantConfig?.id;
  const queryClient = useQueryClient();
  const canManage = isAdmin || isManager;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ShiftForm>(EMPTY_FORM);

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["hr-shift-definitions", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [] as HrShift[];
      const { data, error } = await supabase
        .from("hr_shifts")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .order("start_time");
      if (error) return [] as HrShift[]; // RLS may block the browser role; degrade quietly
      return (data || []) as HrShift[];
    },
    enabled: !!tenantUuid,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["hr-shift-definitions", tenantUuid] });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!tenantUuid) throw new Error("No tenant context");
      if (!form.name.trim()) throw new Error("Name is required");
      if (!form.start_time || !form.end_time) throw new Error("Start and end time are required");
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        start_time: form.start_time,
        end_time: form.end_time,
        break_duration_minutes: form.break_duration_minutes ? Number(form.break_duration_minutes) : null,
        grace_period_minutes: form.grace_period_minutes ? Number(form.grace_period_minutes) : null,
        overtime_threshold_hours: form.overtime_threshold_hours ? Number(form.overtime_threshold_hours) : null,
        is_default: form.is_default,
        is_active: form.is_active,
      };
      if (editingId) {
        const { error } = await supabase
          .from("hr_shifts")
          .update(payload)
          .eq("id", editingId)
          .eq("tenant_id", tenantUuid);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hr_shifts").insert({ ...payload, tenant_id: tenantUuid });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Shift updated" : "Shift added");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save shift"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantUuid) throw new Error("No tenant context");
      const { error } = await supabase.from("hr_shifts").delete().eq("id", id).eq("tenant_id", tenantUuid);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Shift deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete shift"),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (s: HrShift) => {
    setEditingId(s.id);
    setForm({
      name: s.name || "",
      code: s.code || "",
      start_time: hhmm(s.start_time) || "09:00",
      end_time: hhmm(s.end_time) || "17:00",
      break_duration_minutes: s.break_duration_minutes != null ? String(s.break_duration_minutes) : "",
      grace_period_minutes: s.grace_period_minutes != null ? String(s.grace_period_minutes) : "",
      overtime_threshold_hours: s.overtime_threshold_hours != null ? String(s.overtime_threshold_hours) : "",
      is_default: s.is_default ?? false,
      is_active: s.is_active ?? true,
    });
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Shift Types
            </CardTitle>
            <CardDescription>Define the shift templates employees can be assigned to</CardDescription>
          </div>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Add Shift Type
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit Shift Type" : "New Shift Type"}</DialogTitle>
                  <DialogDescription>Configure working hours, breaks and overtime thresholds.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. Morning"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Code</Label>
                      <Input
                        value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                        placeholder="e.g. AM"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Start Time *</Label>
                      <Input
                        type="time"
                        value={form.start_time}
                        onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time *</Label>
                      <Input
                        type="time"
                        value={form.end_time}
                        onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Break (min)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={form.break_duration_minutes}
                        onChange={(e) => setForm({ ...form, break_duration_minutes: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Grace (min)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={form.grace_period_minutes}
                        onChange={(e) => setForm({ ...form, grace_period_minutes: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>OT after (h)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={form.overtime_threshold_hours}
                        onChange={(e) => setForm({ ...form, overtime_threshold_hours: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <Label htmlFor="shift-default" className="font-normal">
                      Default shift
                    </Label>
                    <Switch
                      id="shift-default"
                      checked={form.is_default}
                      onCheckedChange={(v) => setForm({ ...form, is_default: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <Label htmlFor="shift-active" className="font-normal">
                      Active
                    </Label>
                    <Switch
                      id="shift-active"
                      checked={form.is_active}
                      onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => upsertMutation.mutate()} disabled={upsertMutation.isPending}>
                    {upsertMutation.isPending ? "Saving..." : editingId ? "Save Changes" : "Add"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : shifts.length === 0 ? (
          <div className="text-center py-10">
            <Clock className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No shift types configured</p>
            <p className="text-sm text-muted-foreground">
              {canManage ? 'Click "Add Shift Type" to create one' : "Shift types will appear here once configured"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Break</TableHead>
                <TableHead>Grace</TableHead>
                <TableHead>OT after</TableHead>
                <TableHead>Active</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-1.5">
                      {s.name}
                      {s.is_default && <Star className="h-3.5 w-3.5 text-yellow-500" aria-label="default" />}
                    </span>
                  </TableCell>
                  <TableCell>
                    {s.code ? (
                      <Badge variant="outline" className="text-xs">
                        {s.code}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {hhmm(s.start_time)}–{hhmm(s.end_time)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {s.break_duration_minutes != null ? `${s.break_duration_minutes}m` : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {s.grace_period_minutes != null ? `${s.grace_period_minutes}m` : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {s.overtime_threshold_hours != null ? `${s.overtime_threshold_hours}h` : "—"}
                  </TableCell>
                  <TableCell>
                    {s.is_active ? (
                      <CheckCircle2 className="h-4 w-4 text-chart-2" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteMutation.mutate(s.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default ShiftDefinitionsTab;
