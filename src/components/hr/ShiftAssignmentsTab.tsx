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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, CheckCircle2, XCircle, CalendarClock } from "lucide-react";
import { format, parseISO } from "date-fns";

// CRUD over the hr_employee_shifts base table, scoped to the caller's tenant UUID
// (tenantConfig.id). Joins hr_employees + hr_shifts (also tenant-scoped) for the
// dropdowns and row labels. Reads degrade quietly to empty lists if RLS blocks the
// browser role, so the tab never crashes.
//
// hr_employee_shifts currently has RLS enabled + a single permissive
// "Allow authenticated" (USING true) policy — an allow-all that is a latent
// CROSS-TENANT leak. The activation SQL (docs/.hr-rls-activation.sql) DROPs that
// policy and replaces it with the standard tenant-isolation policy. Until applied,
// browser reads here still surface only this tenant's rows because every query is
// explicitly scoped by tenant_id.
interface EmployeeShift {
  id: string;
  tenant_id: string;
  employee_id: string;
  shift_id: string;
  effective_from: string;
  effective_to: string | null;
  days_of_week: number[] | null;
  is_active: boolean | null;
  created_at: string | null;
}

interface AssignmentForm {
  employee_id: string;
  shift_id: string;
  effective_from: string;
  effective_to: string;
  days_of_week: number[];
  is_active: boolean;
}

// ISO weekday convention (1=Mon … 7=Sun) — matches the column default {1,2,3,4,5}
const DAYS: { value: number; label: string }[] = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

const EMPTY_FORM: AssignmentForm = {
  employee_id: "",
  shift_id: "",
  effective_from: "",
  effective_to: "",
  days_of_week: [1, 2, 3, 4, 5],
  is_active: true,
};

function prettyDate(d: string | null): string {
  if (!d) return "—";
  try {
    return format(parseISO(d), "PP");
  } catch {
    return d;
  }
}

function daysLabel(days: number[] | null): string {
  if (!days || days.length === 0) return "—";
  return DAYS.filter((d) => days.includes(d.value)).map((d) => d.label).join(", ");
}

export function ShiftAssignmentsTab() {
  const { tenantConfig } = useTenant();
  const { isAdmin, isManager } = useAuth();
  const tenantUuid = tenantConfig?.id;
  const queryClient = useQueryClient();
  const canManage = isAdmin || isManager;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AssignmentForm>(EMPTY_FORM);

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-min", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [] as { id: string; name: string }[];
      const { data, error } = await supabase
        .from("hr_employees")
        .select("id, first_name, last_name, full_name, company_email")
        .eq("tenant_id", tenantUuid)
        .order("first_name");
      if (error) return [] as { id: string; name: string }[];
      return (data || []).map((e: any) => ({
        id: e.id,
        name:
          e.full_name ||
          `${e.first_name || ""} ${e.last_name || ""}`.trim() ||
          e.company_email ||
          e.id,
      }));
    },
    enabled: !!tenantUuid,
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ["hr-shifts-min", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [] as { id: string; label: string }[];
      const { data, error } = await supabase
        .from("hr_shifts")
        .select("id, name, code, start_time, end_time")
        .eq("tenant_id", tenantUuid)
        .order("start_time");
      if (error) return [] as { id: string; label: string }[];
      return (data || []).map((s: any) => ({
        id: s.id,
        label: `${s.name}${s.code ? ` (${s.code})` : ""} · ${String(s.start_time).slice(0, 5)}–${String(
          s.end_time,
        ).slice(0, 5)}`,
      }));
    },
    enabled: !!tenantUuid,
  });

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["hr-employee-shifts", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [] as EmployeeShift[];
      const { data, error } = await supabase
        .from("hr_employee_shifts")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .order("effective_from", { ascending: false });
      if (error) return [] as EmployeeShift[]; // RLS may block the browser role; degrade quietly
      return (data || []) as EmployeeShift[];
    },
    enabled: !!tenantUuid,
  });

  const empName = (id: string) => employees.find((e) => e.id === id)?.name || id.slice(0, 8);
  const shiftLabel = (id: string) => shifts.find((s) => s.id === id)?.label || id.slice(0, 8);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["hr-employee-shifts", tenantUuid] });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!tenantUuid) throw new Error("No tenant context");
      if (!form.employee_id) throw new Error("Employee is required");
      if (!form.shift_id) throw new Error("Shift is required");
      if (!form.effective_from) throw new Error("Effective-from date is required");
      const payload = {
        employee_id: form.employee_id,
        shift_id: form.shift_id,
        effective_from: form.effective_from,
        effective_to: form.effective_to || null,
        days_of_week: form.days_of_week.length ? [...form.days_of_week].sort((a, b) => a - b) : null,
        is_active: form.is_active,
      };
      if (editingId) {
        const { error } = await supabase
          .from("hr_employee_shifts")
          .update(payload)
          .eq("id", editingId)
          .eq("tenant_id", tenantUuid);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("hr_employee_shifts")
          .insert({ ...payload, tenant_id: tenantUuid });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Assignment updated" : "Assignment added");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save assignment"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantUuid) throw new Error("No tenant context");
      const { error } = await supabase
        .from("hr_employee_shifts")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantUuid);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assignment deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete assignment"),
  });

  const toggleDay = (d: number) =>
    setForm((f) => ({
      ...f,
      days_of_week: f.days_of_week.includes(d)
        ? f.days_of_week.filter((x) => x !== d)
        : [...f.days_of_week, d],
    }));

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (a: EmployeeShift) => {
    setEditingId(a.id);
    setForm({
      employee_id: a.employee_id,
      shift_id: a.shift_id,
      effective_from: a.effective_from || "",
      effective_to: a.effective_to || "",
      days_of_week: a.days_of_week || [],
      is_active: a.is_active ?? true,
    });
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Shift Assignments
            </CardTitle>
            <CardDescription>Assign employees to a recurring shift on specific weekdays</CardDescription>
          </div>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Assign Shift
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit Assignment" : "New Assignment"}</DialogTitle>
                  <DialogDescription>Link an employee to a shift type and weekdays.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Employee *</Label>
                    <Select
                      value={form.employee_id}
                      onValueChange={(v) => setForm({ ...form, employee_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={employees.length ? "Select employee" : "No employees available"} />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Shift *</Label>
                    <Select value={form.shift_id} onValueChange={(v) => setForm({ ...form, shift_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder={shifts.length ? "Select shift" : "No shift types available"} />
                      </SelectTrigger>
                      <SelectContent>
                        {shifts.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Effective From *</Label>
                      <Input
                        type="date"
                        value={form.effective_from}
                        onChange={(e) => setForm({ ...form, effective_from: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Effective To</Label>
                      <Input
                        type="date"
                        value={form.effective_to}
                        onChange={(e) => setForm({ ...form, effective_to: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Working Days</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {DAYS.map((d) => (
                        <Button
                          key={d.value}
                          type="button"
                          size="sm"
                          variant={form.days_of_week.includes(d.value) ? "default" : "outline"}
                          className="w-12"
                          onClick={() => toggleDay(d.value)}
                        >
                          {d.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <Label htmlFor="assign-active" className="font-normal">
                      Active
                    </Label>
                    <Switch
                      id="assign-active"
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
                    {upsertMutation.isPending ? "Saving..." : editingId ? "Save Changes" : "Assign"}
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
        ) : assignments.length === 0 ? (
          <div className="text-center py-10">
            <CalendarClock className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No shift assignments configured</p>
            <p className="text-sm text-muted-foreground">
              {canManage ? 'Click "Assign Shift" to create one' : "Assignments will appear here once configured"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Active</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{empName(a.employee_id)}</TableCell>
                  <TableCell className="text-sm">{shiftLabel(a.shift_id)}</TableCell>
                  <TableCell className="text-sm">{prettyDate(a.effective_from)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{prettyDate(a.effective_to)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{daysLabel(a.days_of_week)}</TableCell>
                  <TableCell>
                    {a.is_active ? (
                      <CheckCircle2 className="h-4 w-4 text-chart-2" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteMutation.mutate(a.id)}
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

export default ShiftAssignmentsTab;
