import { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Pencil, Trash2, CheckCircle2, XCircle, Settings2 } from "lucide-react";

// CRUD over the hr_leave_types base table, scoped to the caller's tenant UUID
// (tenantConfig.id) for parity with the rest of the HR data layer. Reads degrade
// quietly to an empty list if RLS blocks the browser role, so the tab never crashes.
interface LeaveType {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  description: string | null;
  days_per_year: number | null;
  is_paid: boolean | null;
  requires_approval: boolean | null;
  is_active: boolean | null;
  created_at: string | null;
}

interface LeaveTypeForm {
  name: string;
  code: string;
  description: string;
  days_per_year: number;
  is_paid: boolean;
  requires_approval: boolean;
  is_active: boolean;
}

const EMPTY_FORM: LeaveTypeForm = {
  name: "",
  code: "",
  description: "",
  days_per_year: 0,
  is_paid: true,
  requires_approval: true,
  is_active: true,
};

export function LeaveTypesTab() {
  const { tenantConfig } = useTenant();
  const { isAdmin, isManager } = useAuth();
  const tenantUuid = tenantConfig?.id;
  const queryClient = useQueryClient();
  const canManage = isAdmin || isManager;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LeaveTypeForm>(EMPTY_FORM);

  const { data: leaveTypes = [], isLoading } = useQuery({
    queryKey: ["hr-leave-types", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [] as LeaveType[];
      const { data, error } = await supabase
        .from("hr_leave_types")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .order("name");
      if (error) return [] as LeaveType[]; // RLS may block the browser role; degrade quietly
      return (data || []) as LeaveType[];
    },
    enabled: !!tenantUuid,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["hr-leave-types", tenantUuid] });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!tenantUuid) throw new Error("No tenant context");
      if (!form.name.trim()) throw new Error("Name is required");
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        description: form.description.trim() || null,
        days_per_year: Number(form.days_per_year) || 0,
        is_paid: form.is_paid,
        requires_approval: form.requires_approval,
        is_active: form.is_active,
      };
      if (editingId) {
        const { error } = await supabase
          .from("hr_leave_types")
          .update(payload)
          .eq("id", editingId)
          .eq("tenant_id", tenantUuid);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("hr_leave_types")
          .insert({ ...payload, tenant_id: tenantUuid });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Leave type updated" : "Leave type created");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save leave type"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantUuid) throw new Error("No tenant context");
      const { error } = await supabase
        .from("hr_leave_types")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantUuid);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Leave type deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete leave type"),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (lt: LeaveType) => {
    setEditingId(lt.id);
    setForm({
      name: lt.name || "",
      code: lt.code || "",
      description: lt.description || "",
      days_per_year: lt.days_per_year ?? 0,
      is_paid: lt.is_paid ?? true,
      requires_approval: lt.requires_approval ?? true,
      is_active: lt.is_active ?? true,
    });
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Leave Types
            </CardTitle>
            <CardDescription>Configure the leave categories employees can request</CardDescription>
          </div>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Add Leave Type
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit Leave Type" : "New Leave Type"}</DialogTitle>
                  <DialogDescription>
                    Define how this leave category behaves for your team.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Annual Leave"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Code</Label>
                      <Input
                        value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                        placeholder="annual"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Days / Year</Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.days_per_year}
                        onChange={(e) =>
                          setForm({ ...form, days_per_year: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Optional notes about this leave type"
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <Label htmlFor="lt-paid" className="font-normal">
                      Paid leave
                    </Label>
                    <Switch
                      id="lt-paid"
                      checked={form.is_paid}
                      onCheckedChange={(v) => setForm({ ...form, is_paid: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <Label htmlFor="lt-approval" className="font-normal">
                      Requires approval
                    </Label>
                    <Switch
                      id="lt-approval"
                      checked={form.requires_approval}
                      onCheckedChange={(v) => setForm({ ...form, requires_approval: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <Label htmlFor="lt-active" className="font-normal">
                      Active
                    </Label>
                    <Switch
                      id="lt-active"
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
                    {upsertMutation.isPending
                      ? "Saving..."
                      : editingId
                        ? "Save Changes"
                        : "Create"}
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
        ) : leaveTypes.length === 0 ? (
          <div className="text-center py-10">
            <Settings2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No leave types configured</p>
            <p className="text-sm text-muted-foreground">
              {canManage
                ? 'Click "Add Leave Type" to create one'
                : "Leave types will appear here once configured"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Days/Year</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveTypes.map((lt) => (
                <TableRow key={lt.id}>
                  <TableCell className="font-medium">{lt.name}</TableCell>
                  <TableCell className="text-muted-foreground">{lt.code || "—"}</TableCell>
                  <TableCell>{lt.days_per_year ?? 0}</TableCell>
                  <TableCell>
                    {lt.is_paid ? (
                      <CheckCircle2 className="h-4 w-4 text-chart-2" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    {lt.requires_approval ? (
                      <Badge variant="outline" className="text-xs">
                        Required
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Auto</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={lt.is_active ? "secondary" : "outline"} className="text-xs">
                      {lt.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(lt)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteMutation.mutate(lt.id)}
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

export default LeaveTypesTab;
