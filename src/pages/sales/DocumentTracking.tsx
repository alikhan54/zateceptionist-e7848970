import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { callWebhook } from "@/lib/webhook";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSearch, Plus, Copy, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DocTrack {
  id: string; document_name: string; document_type: string; recipient_email?: string;
  tracking_token: string; total_views: number; status: string;
  first_viewed_at?: string; last_viewed_at?: string; created_at?: string;
}

export default function DocumentTracking() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newDoc, setNewDoc] = useState({ document_name: "", document_type: "proposal", recipient_email: "", document_url: "" });

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["document_tracking", tenantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("document_tracking").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as DocTrack[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (doc: typeof newDoc) => {
      const r = await callWebhook("/create-tracking-link", { ...doc, tenant_id: tenantId }, tenantId);
      return r;
    },
    onSuccess: (r: any) => {
      queryClient.invalidateQueries({ queryKey: ["document_tracking", tenantId] });
      if (r?.tracking_pixel_html) {
        navigator.clipboard.writeText(r.tracking_pixel_html);
        toast.success("Tracking link created! Pixel HTML copied to clipboard.");
      }
      setShowCreate(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold flex items-center gap-2"><FileSearch className="h-8 w-8" /> Document Tracking</h1>
        <p className="text-muted-foreground mt-1">Track when prospects open your proposals</p></div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Create Tracking Link</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Tracking Link</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Document Name *" value={newDoc.document_name} onChange={e => setNewDoc({...newDoc, document_name: e.target.value})} />
              <Select value={newDoc.document_type} onValueChange={v => setNewDoc({...newDoc, document_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="proposal">Proposal</SelectItem><SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="case_study">Case Study</SelectItem><SelectItem value="brochure">Brochure</SelectItem>
                  <SelectItem value="presentation">Presentation</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Recipient Email" value={newDoc.recipient_email} onChange={e => setNewDoc({...newDoc, recipient_email: e.target.value})} />
              <Input placeholder="Document URL (optional)" value={newDoc.document_url} onChange={e => setNewDoc({...newDoc, document_url: e.target.value})} />
              <Button className="w-full" onClick={() => createMutation.mutate(newDoc)} disabled={!newDoc.document_name}>Create + Copy Pixel</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{docs.length}</div><div className="text-xs text-muted-foreground">Tracked Documents</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-green-400">{docs.filter(d => d.status === 'viewed').length}</div><div className="text-xs text-muted-foreground">Viewed</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-blue-400">{docs.reduce((s, d) => s + d.total_views, 0)}</div><div className="text-xs text-muted-foreground">Total Views</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {docs.map(doc => (
              <div key={doc.id} className={`flex items-center justify-between py-3 border-b last:border-0 ${doc.status === 'viewed' ? 'bg-green-500/5 -mx-4 px-4 rounded' : ''}`}>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {doc.document_name}
                    <Badge variant="outline" className="text-xs">{doc.document_type}</Badge>
                    <Badge className={doc.status === 'viewed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}>{doc.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{doc.recipient_email || 'No recipient'} | {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1"><Eye className="h-3 w-3" /><span className="font-semibold">{doc.total_views}</span></div>
                    {doc.last_viewed_at && <div className="text-xs text-muted-foreground">Last: {new Date(doc.last_viewed_at).toLocaleString()}</div>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(`<img src="https://webhooks.zatesystems.com/webhook/doc-pixel?t=${doc.tracking_token}" width="1" height="1" style="display:none" />`); toast.success("Pixel copied"); }}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            {docs.length === 0 && <div className="text-center py-8 text-muted-foreground">No tracked documents yet.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
