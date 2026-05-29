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
import { Plus, Pencil, Trash2, CheckCircle2, XCircle, CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";

// CRUD over the hr_public_holidays base table, scoped to the caller's tenant UUID
// (tenantConfig.id) for parity with the rest of the HR data layer. Reads degrade
// quietly to an empty list if RLS blocks the browser role, so the tab never crashes.
interface PublicHoliday {
  id: string;
  tenant_id: string;
  name: string;
  date: string;
  type: string | null;
  is_paid: boolean | null;
  applicable_locations: string[] | null;
  created_at: string | null;
}

interface HolidayForm {
  name: string;
  date: string;
  type: string;
  is_paid: boolean;
  applicable_locations: string;
}

const EMPTY_FORM: HolidayForm = {
  name: "",
  date: "",
  type: "public",
  is_paid: true,
  applicable_locations: "",
};

const HOLIDAY_TYPES = ["public", "national", "religious", "company", "optional"];

function prettyDate(d: string): string {
  try {
    return format(parseISO(d), "PP");
  } catch {
    return d;
  }
}

export function PublicHolidaysTab() {
  const { tenantConfig } = useTenant();
  const { isAdmin, isManager } = useAuth();
  const tenantUuid = tenantConfig?.id;
  const queryClient = useQueryClient();
  const canManage = isAdmin || isManager;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HolidayForm>(EMPTY_FORM);

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ["hr-public-holidays", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [] as PublicHoliday[];
      const { data, error } = await supabase
        .from("hr_public_holidays")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .order("date");
      if (error) return [] as PublicHoliday[]; // RLS may block the browser role; degrade quietly
      return (data || []) as PublicHoliday[];
    },
    enabled: !!tenantUuid,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["hr-public-holidays", tenantUuid] });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!tenantUuid) throw new Error("No tenant context");
      if (!form.name.trim()) throw new Error("Name is required");
      if (!form.date) throw new Error("Date is required");
      const locations = form.applicable_locations
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const payload = {
        name: form.name.trim(),
        date: form.date,
        type: form.type || "public",
        is_paid: form.is_paid,
        applicable_locations: locations.length ? locations : null,
      };
      if (editingId) {
        const { error } = await supabase
          .from("hr_public_holidays")
          .update(payload)
          .eq("id", editingId)
          .eq("tenant_id", tenantUuid);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("hr_public_holidays")
          .insert({ ...payload, tenant_id: tenantUuid });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Holiday updated" : "Holiday added");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save holiday"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantUuid) throw new Error("No tenant context");
      const { error } = await supabase
        .from("hr_public_holidays")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantUuid);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Holiday deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete holiday"),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (h: PublicHoliday) => {
    setEditingId(h.id);
    setForm({
      name: h.name || "",
      date: h.date || "",
      type: h.type || "public",
      is_paid: h.is_paid ?? true,
      applicable_locations: (h.applicable_locations || []).join(", "),
    });
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Public Holidays
            </CardTitle>
            <CardDescription>Company-wide holidays that count against the working calendar</CardDescription>
          </div>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Add Holiday
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit Holiday" : "New Holiday"}</DialogTitle>
                  <DialogDescription>
                    Add a public holiday to the working calendar.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. New Year's Day"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Date *</Label>
                      <Input
                        type="date"
                        value={form.date}
                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={form.type}
                        onValueChange={(v) => setForm({ ...form, type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {HOLIDAY_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t.charAt(0).toUpperCase() + t.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Applicable Locations</Label>
                    <Input
                      value={form.applicable_locations}
                      onChange={(e) =>
                        setForm({ ...form, applicable_locations: e.target.value })
                      }
                      placeholder="Comma-separated, e.g. Dubai, Abu Dhabi (blank = all)"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <Label htmlFor="ph-paid" className="font-normal">
                      Paid holiday
                    </Label>
                    <Switch
                      id="ph-paid"
                      checked={form.is_paid}
                      onCheckedChange={(v) => setForm({ ...form, is_paid: v })}
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
                        : "Add"}
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
        ) : holidays.length === 0 ? (
          <div className="text-center py-10">
            <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No public holidays configured</p>
            <p className="text-sm text-muted-foreground">
              {canManage
                ? 'Click "Add Holiday" to create one'
                : "Holidays will appear here once configured"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Locations</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.name}</TableCell>
                  <TableCell>{prettyDate(h.date)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {h.type || "public"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {h.is_paid ? (
                      <CheckCircle2 className="h-4 w-4 text-chart-2" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {h.applicable_locations && h.applicable_locations.length
                      ? h.applicable_locations.join(", ")
                      : "All"}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(h)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteMutation.mutate(h.id)}
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

export default PublicHolidaysTab;
