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

interface CampaignLike {
  id: string;
  name?: string | null;
  channel?: string | null;
  status?: string | null;
  scheduled_at?: string | null;
  message_template?: string | null;
}

interface EditCampaignDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  campaign: CampaignLike | null;
}

const CHANNELS = ["email", "sms", "whatsapp", "social", "push"];
const STATUSES = ["draft", "scheduled", "active", "paused", "completed"];

export function EditCampaignDialog({ open, onOpenChange, campaign }: EditCampaignDialogProps) {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [channel, setChannel] = useState("email");
  const [status, setStatus] = useState("draft");
  const [scheduledAt, setScheduledAt] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");

  useEffect(() => {
    if (open && campaign) {
      setName(campaign.name || "");
      setChannel(campaign.channel || "email");
      setStatus(campaign.status || "draft");
      setScheduledAt(campaign.scheduled_at ? new Date(campaign.scheduled_at).toISOString().slice(0, 16) : "");
      setMessageTemplate(campaign.message_template || "");
    }
  }, [open, campaign]);

  const update = useMutation({
    mutationFn: async () => {
      if (!campaign?.id) throw new Error("No campaign");
      const updates: any = {
        name: name.trim() || campaign.name,
        channel,
        status,
        message_template: messageTemplate.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (scheduledAt) updates.scheduled_at = new Date(scheduledAt).toISOString();
      const { error } = await supabase
        .from("marketing_campaigns" as any)
        .update(updates)
        .eq("id", campaign.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing_campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Campaign updated" });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Could not update", description: e?.message || "Unknown error", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="edit-campaign-dialog">
        <DialogHeader>
          <DialogTitle>Edit campaign</DialogTitle>
          <DialogDescription>{campaign?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ec-name">Name</Label>
            <Input id="ec-name" data-testid="edit-campaign-name-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ec-channel">Channel</Label>
              <select id="ec-channel" data-testid="edit-campaign-channel-input" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={channel} onChange={(e) => setChannel(e.target.value)}>
                {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-status">Status</Label>
              <select id="ec-status" data-testid="edit-campaign-status-input" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ec-scheduled">Scheduled at</Label>
            <Input id="ec-scheduled" type="datetime-local" data-testid="edit-campaign-scheduled-input" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ec-message">Message template</Label>
            <Textarea id="ec-message" rows={4} data-testid="edit-campaign-message-input" value={messageTemplate} onChange={(e) => setMessageTemplate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => update.mutate()} disabled={update.isPending} data-testid="edit-campaign-submit">
            {update.isPending ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
