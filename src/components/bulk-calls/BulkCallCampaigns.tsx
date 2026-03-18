import { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useBulkCallCampaigns } from "@/hooks/useBulkCallCampaigns";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Phone, Plus, Play, Pause, Eye, Loader2 } from "lucide-react";
import { BulkCallWizard } from "./BulkCallWizard";
import { BulkCallDetail } from "./BulkCallDetail";

export function BulkCallCampaigns() {
  const { tenantId } = useTenant();
  const { campaigns, startCampaign, pauseCampaign } = useBulkCallCampaigns(tenantId);
  const { toast } = useToast();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [detailCampaignId, setDetailCampaignId] = useState<string | null>(null);

  const statusBadge = (status: string) => {
    const map: Record<string, { className: string; label: string }> = {
      draft: { className: "bg-gray-100 text-gray-700", label: "Draft" },
      running: { className: "bg-green-100 text-green-700 animate-pulse", label: "Running" },
      paused: { className: "bg-amber-100 text-amber-700", label: "Paused" },
      completed: { className: "bg-blue-100 text-blue-700", label: "Completed" },
      cancelled: { className: "bg-red-100 text-red-700", label: "Cancelled" },
    };
    const s = map[status] || { className: "bg-gray-100 text-gray-700", label: status };
    return <Badge className={s.className}>{s.label}</Badge>;
  };

  const handleStart = async (id: string) => {
    try {
      const result = await startCampaign.mutateAsync(id);
      if (result.success) {
        toast({ title: "Campaign started", description: "Calls will begin processing shortly." });
      } else {
        toast({ title: "Error", description: result.error || "Failed to start", variant: "destructive" });
      }
    } catch { toast({ title: "Error", description: "Failed to start campaign", variant: "destructive" }); }
  };

  const handlePause = async (id: string) => {
    try {
      await pauseCampaign.mutateAsync(id);
      toast({ title: "Campaign paused" });
    } catch { toast({ title: "Error", description: "Failed to pause", variant: "destructive" }); }
  };

  if (detailCampaignId) {
    return <BulkCallDetail campaignId={detailCampaignId} onBack={() => setDetailCampaignId(null)} />;
  }

  const data = (campaigns.data || []) as any[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Bulk Call Campaigns</h2>
        <Button onClick={() => setWizardOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Campaign
        </Button>
      </div>

      {data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No bulk call campaigns yet</p>
            <p className="text-sm mt-1">Create your first campaign to start calling contacts in bulk.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {data.map((camp: any) => {
            const progress = camp.total_contacts > 0
              ? Math.round(((camp.called || 0) + (camp.skipped || 0) + (camp.failed || 0)) / camp.total_contacts * 100)
              : 0;
            return (
              <Card key={camp.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{camp.name}</h3>
                      {statusBadge(camp.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      {(camp.status === "draft" || camp.status === "paused") && (
                        <Button size="sm" variant="outline" onClick={() => handleStart(camp.id)}
                          disabled={startCampaign.isPending}>
                          {startCampaign.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                          <span className="ml-1">Start</span>
                        </Button>
                      )}
                      {camp.status === "running" && (
                        <Button size="sm" variant="outline" onClick={() => handlePause(camp.id)}>
                          <Pause className="h-3 w-3 mr-1" /> Pause
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setDetailCampaignId(camp.id)}>
                        <Eye className="h-3 w-3 mr-1" /> Details
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                    <span className="capitalize">{camp.purpose?.replace("_", " ")}</span>
                    <span>{camp.total_contacts} contacts</span>
                    <span>Called: {camp.called || 0}</span>
                    <span>Answered: {camp.answered || 0}</span>
                    {(camp.skipped || 0) > 0 && <span>Skipped: {camp.skipped}</span>}
                    {(camp.failed || 0) > 0 && <span className="text-red-500">Failed: {camp.failed}</span>}
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{progress}% processed</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <BulkCallWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}
