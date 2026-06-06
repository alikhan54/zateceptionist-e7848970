import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useAccountingJobTypes,
  useAccountingJobTypesAdmin,
  type AccountingJobType,
} from "@/hooks/useAccountingJobTypes";

/**
 * Wave 2a Phase 4 — minimal admin to add / edit / disable job types.
 * Editable per row: name, default_fee, auto_reminder, active. Plus an add form
 * (name + optional fee; code auto-slugged; anchor defaults to manual). Full
 * interval/anchor editing is intentionally light here (Wave 2b can expand).
 */
export function ManageJobTypesDialog() {
  const { toast } = useToast();
  const { data: allTypes = [], isLoading } = useAccountingJobTypes({ activeOnly: false });
  const { createJobType, updateJobType } = useAccountingJobTypesAdmin();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFee, setNewFee] = useState("");

  async function patch(t: AccountingJobType, patchObj: Partial<AccountingJobType>) {
    try {
      await updateJobType.mutateAsync({ id: t.id, patch: patchObj });
    } catch (e) {
      toast({ title: "Couldn't update type", description: e instanceof Error ? e.message : "error", variant: "destructive" });
    }
  }

  async function addType() {
    const name = newName.trim();
    if (!name) { toast({ title: "Name required", variant: "destructive" }); return; }
    try {
      await createJobType.mutateAsync({
        name,
        default_fee: newFee.trim() ? Number(newFee) : null,
      });
      toast({ title: "Job type added", description: name });
      setNewName(""); setNewFee("");
    } catch (e) {
      toast({ title: "Couldn't add type", description: e instanceof Error ? e.message : "error", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="manage-job-types-button">
          <Settings2 className="mr-1.5 h-4 w-4" /> Manage types
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl" data-testid="manage-job-types-dialog">
        <DialogHeader>
          <DialogTitle>Manage job types</DialogTitle>
          <DialogDescription>
            Add, edit the fee, toggle auto-reminders, or disable a job type. Disabled
            types stop appearing in the Create Job picker but keep existing jobs intact.
          </DialogDescription>
        </DialogHeader>

        {/* Add new */}
        <div className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/30 p-3">
          <div className="flex-1 min-w-[180px] space-y-1">
            <Label htmlFor="njt-name" className="text-xs">New type name</Label>
            <Input id="njt-name" data-testid="njt-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. CIS Verification" />
          </div>
          <div className="w-28 space-y-1">
            <Label htmlFor="njt-fee" className="text-xs">Default fee (£)</Label>
            <Input id="njt-fee" data-testid="njt-fee" type="number" value={newFee} onChange={(e) => setNewFee(e.target.value)} placeholder="—" />
          </div>
          <Button onClick={addType} disabled={createJobType.isPending} data-testid="njt-add">Add type</Button>
        </div>

        {/* List */}
        <div className="space-y-1.5">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            allTypes.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-md border p-2 text-sm" data-testid={`jt-row-${t.code}`}>
                <Input
                  className="h-8 flex-1 min-w-[160px]"
                  defaultValue={t.name}
                  data-testid={`jt-name-${t.code}`}
                  onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== t.name) patch(t, { name: v }); }}
                />
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">£</span>
                  <Input
                    className="h-8 w-24"
                    type="number"
                    defaultValue={t.default_fee ?? ""}
                    data-testid={`jt-fee-${t.code}`}
                    onBlur={(e) => {
                      const raw = e.target.value.trim();
                      const v = raw === "" ? null : Number(raw);
                      if (v !== t.default_fee) patch(t, { default_fee: v });
                    }}
                  />
                </div>
                <label className="flex items-center gap-1.5 text-xs">
                  <Switch
                    checked={t.auto_reminder}
                    data-testid={`jt-reminder-${t.code}`}
                    onCheckedChange={(c) => patch(t, { auto_reminder: c })}
                  />
                  reminders
                </label>
                <label className="flex items-center gap-1.5 text-xs">
                  <Switch
                    checked={t.active}
                    data-testid={`jt-active-${t.code}`}
                    onCheckedChange={(c) => patch(t, { active: c })}
                  />
                  {t.active ? "active" : "disabled"}
                </label>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
