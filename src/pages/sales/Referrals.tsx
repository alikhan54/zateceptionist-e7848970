import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { callWebhook } from "@/lib/webhook";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Send, Loader2, ArrowRight, DollarSign, TrendingUp, Award } from "lucide-react";
import { toast } from "sonner";
import { FeatureBanner } from "@/components/FeatureBanner";

interface Referral {
  id: string;
  tenant_id: string;
  referrer_name?: string;
  referrer_email?: string;
  referrer_company?: string;
  referred_name?: string;
  referred_email?: string;
  referred_company?: string;
  status: string;
  created_at?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  submitted: "bg-blue-500/20 text-blue-400",
  contacted: "bg-purple-500/20 text-purple-400",
  converted: "bg-green-500/20 text-green-400",
  declined: "bg-red-500/20 text-red-400",
  expired: "bg-gray-500/20 text-gray-400",
};

export default function Referrals() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState("");

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ["referrals", tenantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("referrals")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Referral[];
    },
    enabled: !!tenantId,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads_for_referral", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_leads")
        .select("id, contact_name, company_name, email")
        .eq("tenant_id", tenantId as string)
        .not("email", "is", null)
        .order("contact_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const requestMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const result = await callWebhook("/request-referral", { tenant_id: tenantId, lead_id: leadId }, tenantId);
      return result;
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["referrals", tenantId] });
      setShowRequestDialog(false);
      if (result?.success) {
        toast.success(`Referral request sent to ${result.email}`);
      } else {
        toast.error(result?.message || "Failed to send");
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusCounts: Record<string, number> = {};
  referrals.forEach((r) => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });
  const convRate = referrals.length > 0 ? Math.round(((statusCounts.converted || 0) / referrals.length) * 100) : 0;

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><UserPlus className="h-8 w-8" /> Referrals</h1>
          <p className="text-muted-foreground mt-1">Leverage customers for warm introductions</p>
        </div>

      <FeatureBanner icon={UserPlus} title="Referral Program" description="Your best leads come from happy customers. Referral leads convert 5x faster." stat="5x" statLabel="faster conversion" />
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogTrigger asChild>
            <Button><Send className="h-4 w-4 mr-2" /> Request Referral</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Request Referral from Customer</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Select a customer to send a referral request email</p>
              <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                <SelectTrigger><SelectValue placeholder="Select a customer..." /></SelectTrigger>
                <SelectContent>
                  {leads.map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>{l.contact_name || l.company_name} ({l.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="w-full" onClick={() => requestMutation.mutate(selectedLeadId)} disabled={!selectedLeadId || requestMutation.isPending}>
                {requestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Send Referral Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{referrals.length}</div><div className="text-xs text-muted-foreground">Total</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-yellow-400">{statusCounts.pending || 0}</div><div className="text-xs text-muted-foreground">Pending</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-purple-400">{statusCounts.contacted || 0}</div><div className="text-xs text-muted-foreground">Contacted</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-green-400">{statusCounts.converted || 0}</div><div className="text-xs text-muted-foreground">Converted</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-blue-400">{convRate}%</div><div className="text-xs text-muted-foreground">Conv. Rate</div></CardContent></Card>
      </div>

      {/* Value Proposition */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
          <CardContent className="pt-6 text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">$0</p>
            <p className="text-xs text-muted-foreground">Acquisition Cost</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
          <CardContent className="pt-6 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">5x</p>
            <p className="text-xs text-muted-foreground">Faster Close Rate</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20">
          <CardContent className="pt-6 text-center">
            <Award className="w-8 h-8 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">80%</p>
            <p className="text-xs text-muted-foreground">Higher Lifetime Value</p>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold mb-4">How Referrals Work</h3>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">1</div>
              <span className="text-muted-foreground">Request from client</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground hidden md:block" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">2</div>
              <span className="text-muted-foreground">Client introduces lead</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground hidden md:block" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">3</div>
              <span className="text-muted-foreground">Lead enters pipeline (score +25)</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground hidden md:block" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">4</div>
              <span className="text-muted-foreground">Track & reward referrer</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referrals Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {referrals.map((ref) => (
              <div key={ref.id} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="font-medium">{ref.referrer_name || "Unknown"}</div>
                    <div className="text-xs text-muted-foreground">{ref.referrer_company}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{ref.referred_name || "Awaiting referral..."}</div>
                    <div className="text-xs text-muted-foreground">{ref.referred_company || ref.referred_email || ""}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={STATUS_COLORS[ref.status]}>{ref.status}</Badge>
                  <span className="text-xs text-muted-foreground">{ref.created_at ? new Date(ref.created_at).toLocaleDateString() : ""}</span>
                </div>
              </div>
            ))}
            {referrals.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No referrals yet. Request one from a happy customer above.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
