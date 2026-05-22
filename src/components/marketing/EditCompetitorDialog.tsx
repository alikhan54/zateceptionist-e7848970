import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface CompetitorLike {
  id: string;
  competitor_name?: string | null;
  website_url?: string | null;
  instagram_url?: string | null;
  priority_level?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

interface EditCompetitorDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  competitor: CompetitorLike | null;
}

const PRIORITIES = ["high", "medium", "low"];

export function EditCompetitorDialog({ open, onOpenChange, competitor }: EditCompetitorDialogProps) {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantUuid = tenantConfig?.id || "";

  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [priority, setPriority] = useState("medium");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (open && competitor) {
      setName(competitor.competitor_name || "");
      setWebsiteUrl(competitor.website_url || "");
      setInstagramUrl(competitor.instagram_url || "");
      setPriority(competitor.priority_level || "medium");
      setNotes(competitor.notes || "");
      setIsActive(competitor.is_active !== false);
    }
  }, [open, competitor]);

  const update = useMutation({
    mutationFn: async () => {
      if (!competitor?.id) throw new Error("No competitor");
      const { error } = await supabase
        .from("competitor_tracking" as any)
        .update({
          competitor_name: name.trim() || competitor.competitor_name,
          website_url: websiteUrl.trim() || null,
          instagram_url: instagramUrl.trim() || null,
          priority_level: priority,
          notes: notes.trim() || null,
          is_active: isActive,
        } as any)
        .eq("id", competitor.id)
        .eq("tenant_id", tenantUuid);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competitor_tracking"] });
      queryClient.invalidateQueries({ queryKey: ["competitor_analysis"] });
      toast({ title: "Competitor updated" });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Could not update", description: e?.message || "Unknown error", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="edit-competitor-dialog">
        <DialogHeader>
          <DialogTitle>Edit competitor</DialogTitle>
          <DialogDescription>{competitor?.competitor_name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ecomp-name">Name</Label>
            <Input id="ecomp-name" data-testid="edit-competitor-name-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ecomp-website">Website URL</Label>
            <Input id="ecomp-website" data-testid="edit-competitor-website-input" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ecomp-ig">Instagram URL</Label>
            <Input id="ecomp-ig" data-testid="edit-competitor-instagram-input" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ecomp-priority">Priority</Label>
              <select id="ecomp-priority" data-testid="edit-competitor-priority-input" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={priority} onChange={(e) => setPriority(e.target.value)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ecomp-active">Active</Label>
              <select id="ecomp-active" data-testid="edit-competitor-active-input" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={isActive ? "true" : "false"} onChange={(e) => setIsActive(e.target.value === "true")}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ecomp-notes">Notes</Label>
            <Textarea id="ecomp-notes" rows={3} data-testid="edit-competitor-notes-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => update.mutate()} disabled={update.isPending} data-testid="edit-competitor-submit">
            {update.isPending ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
