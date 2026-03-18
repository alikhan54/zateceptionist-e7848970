import { useTenant } from "@/contexts/TenantContext";
import { useBulkCallContacts } from "@/hooks/useBulkCallCampaigns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Phone, CheckCircle, XCircle, Clock, Ban } from "lucide-react";

export function BulkCallDetail({ campaignId, onBack }: { campaignId: string; onBack: () => void }) {
  const { tenantId } = useTenant();
  const { data: contacts = [], isLoading } = useBulkCallContacts(campaignId, tenantId);

  const statusBadge = (status: string) => {
    const map: Record<string, { icon: any; className: string; label: string }> = {
      pending: { icon: Clock, className: "bg-gray-100 text-gray-700", label: "Pending" },
      calling: { icon: Phone, className: "bg-blue-100 text-blue-700 animate-pulse", label: "Calling" },
      completed: { icon: CheckCircle, className: "bg-green-100 text-green-700", label: "Completed" },
      failed: { icon: XCircle, className: "bg-red-100 text-red-700", label: "Failed" },
      dnc: { icon: Ban, className: "bg-amber-100 text-amber-700", label: "DNC" },
      no_answer: { icon: Phone, className: "bg-orange-100 text-orange-700", label: "No Answer" },
    };
    const s = map[status] || { icon: Clock, className: "bg-gray-100 text-gray-700", label: status };
    const Icon = s.icon;
    return <Badge className={s.className}><Icon className="h-3 w-3 mr-1" />{s.label}</Badge>;
  };

  const allContacts = contacts as any[];
  const pending = allContacts.filter(c => c.call_status === "pending").length;
  const called = allContacts.filter(c => !["pending", "dnc"].includes(c.call_status)).length;
  const answered = allContacts.filter(c => c.call_status === "completed").length;
  const failed = allContacts.filter(c => c.call_status === "failed").length;
  const dnc = allContacts.filter(c => c.call_status === "dnc").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h2 className="text-lg font-semibold">Campaign Contacts</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{allContacts.length}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{pending}</p><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-blue-600">{called}</p><p className="text-xs text-muted-foreground">Called</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-green-600">{answered}</p><p className="text-xs text-muted-foreground">Answered</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-red-600">{failed + dnc}</p><p className="text-xs text-muted-foreground">Failed/DNC</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Contacts ({allContacts.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-6 text-muted-foreground">Loading...</p>
          ) : allContacts.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No contacts</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Phone</th>
                    <th className="p-2 text-left">Company</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Duration</th>
                    <th className="p-2 text-left">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {allContacts.map((c: any) => (
                    <tr key={c.id} className="border-t hover:bg-muted/30">
                      <td className="p-2">{c.contact_name || "—"}</td>
                      <td className="p-2 font-mono text-xs">{c.phone_number}</td>
                      <td className="p-2">{c.company_name || "—"}</td>
                      <td className="p-2">{statusBadge(c.call_status)}</td>
                      <td className="p-2">{c.call_duration_seconds ? `${c.call_duration_seconds}s` : "—"}</td>
                      <td className="p-2">{c.call_outcome || c.skip_reason || "—"}</td>
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
