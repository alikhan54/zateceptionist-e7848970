import { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useManualEmailCampaigns } from "@/hooks/useManualEmailCampaigns";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Mail, Plus, Play, Pause, Eye, Loader2, AlertTriangle } from "lucide-react";
import { EmailCampaignWizard } from "./EmailCampaignWizard";
import { EmailCampaignDetail } from "./EmailCampaignDetail";

export function EmailCampaigns() {
  const { tenantId, tenantConfig } = useTenant();
  const { campaigns, startCampaign, pauseCampaign } = useManualEmailCampaigns(tenantId);
  const { toast } = useToast();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [detailCampaignId, setDetailCampaignId] = useState<string | null>(null);

  const smtpConfigured = !!(tenantConfig?.smtp_host);

  const statusBadge = (status: string) => {
    const map: Record<string, { className: string; label: string }> = {
      draft: { className: "bg-gray-100 text-gray-700", label: "Draft" },
      sending: { className: "bg-green-100 text-green-700 animate-pulse", label: "Sending" },
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
        toast({ title: "Campaign started", description: "Emails will begin sending shortly." });
      } else if (result.error === "no_email_provider") {
        toast({
          title: "No email provider configured",
          description: "Connect your email in Settings > Integrations before sending campaigns.",
          variant: "destructive",
        });
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
    return <EmailCampaignDetail campaignId={detailCampaignId} onBack={() => setDetailCampaignId(null)} />;
  }

  const data = (campaigns.data || []) as any[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Email Campaigns</h2>
        <Button onClick={() => setWizardOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Campaign
        </Button>
      </div>

      {!smtpConfigured && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800">
              SMTP not configured. Go to <a href="/settings" className="underline font-medium">Settings &gt; Integrations</a> to connect your email before sending campaigns.
            </span>
          </CardContent>
        </Card>
      )}

      {data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No email campaigns yet</p>
            <p className="text-sm mt-1">Create your first campaign to send bulk emails.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {data.map((camp: any) => {
            const progress = camp.total_recipients > 0
              ? Math.round(((camp.sent || 0) + (camp.failed || 0)) / camp.total_recipients * 100) : 0;
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
                          <span className="ml-1">Send</span>
                        </Button>
                      )}
                      {camp.status === "sending" && (
                        <Button size="sm" variant="outline" onClick={() => handlePause(camp.id)}>
                          <Pause className="h-3 w-3 mr-1" /> Pause
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setDetailCampaignId(camp.id)}>
                        <Eye className="h-3 w-3 mr-1" /> Details
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mb-2">Subject: {camp.subject}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                    <span>{camp.total_recipients} recipients</span>
                    <span>Sent: {camp.sent || 0}</span>
                    {(camp.failed || 0) > 0 && <span className="text-red-500">Failed: {camp.failed}</span>}
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{progress}% sent</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <EmailCampaignWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}
