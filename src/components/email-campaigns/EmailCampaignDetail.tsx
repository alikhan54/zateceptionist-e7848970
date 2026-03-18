import { useTenant } from "@/contexts/TenantContext";
import { useManualEmailRecipients } from "@/hooks/useManualEmailCampaigns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, CheckCircle, XCircle, Clock } from "lucide-react";

export function EmailCampaignDetail({ campaignId, onBack }: { campaignId: string; onBack: () => void }) {
  const { tenantId } = useTenant();
  const { data: recipients = [], isLoading } = useManualEmailRecipients(campaignId, tenantId);

  const statusBadge = (status: string) => {
    const map: Record<string, { icon: any; className: string; label: string }> = {
      pending: { icon: Clock, className: "bg-gray-100 text-gray-700", label: "Pending" },
      sent: { icon: CheckCircle, className: "bg-green-100 text-green-700", label: "Sent" },
      failed: { icon: XCircle, className: "bg-red-100 text-red-700", label: "Failed" },
      bounced: { icon: XCircle, className: "bg-orange-100 text-orange-700", label: "Bounced" },
      dnc_skipped: { icon: Mail, className: "bg-amber-100 text-amber-700", label: "DNC" },
    };
    const s = map[status] || { icon: Clock, className: "bg-gray-100 text-gray-700", label: status };
    const Icon = s.icon;
    return <Badge className={s.className}><Icon className="h-3 w-3 mr-1" />{s.label}</Badge>;
  };

  const allRecipients = recipients as any[];
  const pending = allRecipients.filter(r => r.send_status === "pending").length;
  const sent = allRecipients.filter(r => r.send_status === "sent").length;
  const failed = allRecipients.filter(r => r.send_status === "failed").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h2 className="text-lg font-semibold">Campaign Recipients</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{allRecipients.length}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{pending}</p><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-green-600">{sent}</p><p className="text-xs text-muted-foreground">Sent</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-red-600">{failed}</p><p className="text-xs text-muted-foreground">Failed</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recipients ({allRecipients.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-6 text-muted-foreground">Loading...</p>
          ) : allRecipients.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No recipients</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Company</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Sent At</th>
                    <th className="p-2 text-left">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {allRecipients.map((r: any) => (
                    <tr key={r.id} className="border-t hover:bg-muted/30">
                      <td className="p-2 text-xs">{r.email}</td>
                      <td className="p-2">{r.name || "—"}</td>
                      <td className="p-2">{r.company || "—"}</td>
                      <td className="p-2">{statusBadge(r.send_status)}</td>
                      <td className="p-2 text-xs">{r.sent_at ? new Date(r.sent_at).toLocaleString() : "—"}</td>
                      <td className="p-2 text-xs text-red-500 max-w-[200px] truncate">{r.failed_reason || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
