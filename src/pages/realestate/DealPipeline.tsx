import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRealEstateDeals } from "@/hooks/useRealEstateDeals";
import { Handshake, DollarSign, FileCheck, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { RTLWrapper } from "@/components/realestate/RTLWrapper";

const formatAED = (amount: number) => `AED ${amount.toLocaleString()}`;

const stageLabels: Record<string, string> = {
  offer: "Offer", negotiation: "Negotiation", mou_signing: "MOU Signing",
  deposit_received: "Deposit Received", noc_applied: "NOC Applied", noc_received: "NOC Received",
  dld_transfer: "DLD Transfer", completed: "Completed",
};

const stageColors: Record<string, string> = {
  offer: "bg-blue-100 text-blue-800", negotiation: "bg-yellow-100 text-yellow-800",
  mou_signing: "bg-purple-100 text-purple-800", deposit_received: "bg-indigo-100 text-indigo-800",
  noc_applied: "bg-orange-100 text-orange-800", noc_received: "bg-teal-100 text-teal-800",
  dld_transfer: "bg-pink-100 text-pink-800", completed: "bg-green-100 text-green-800",
};

const dealTypeLabels: Record<string, string> = {
  sale: "Sale", rent: "Rental", off_plan: "Off-Plan",
};

export default function DealPipeline() {
  const [stageFilter, setStageFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const { deals, isLoading, stats, DEAL_STAGES } = useRealEstateDeals({
    stage: stageFilter || undefined,
    deal_type: typeFilter || undefined,
  });

  const reraStatus = (deal: any) => {
    const checks = [
      { label: "Form A", done: deal.form_a_signed },
      { label: "Form B", done: deal.form_b_signed },
      { label: "Form F (MOU)", done: deal.form_f_signed },
      { label: "Deposit", done: deal.deposit_received },
      { label: "NOC", done: !!deal.noc_received_date },
    ];
    return checks;
  };

  return (
    <RTLWrapper>
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Deal Pipeline</h1>
        <p className="text-muted-foreground">Track transactions from offer to completion</p>
      </div>

      <div className="flex gap-4">
        <Select value={stageFilter || "all"} onValueChange={v => setStageFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {DEAL_STAGES.map(s => <SelectItem key={s} value={s}>{stageLabels[s] || s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter || "all"} onValueChange={v => setTypeFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="sale">Sale</SelectItem><SelectItem value="rent">Rental</SelectItem><SelectItem value="off_plan">Off-Plan</SelectItem></SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.activeDeals}</div><p className="text-xs text-muted-foreground">Active Deals</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{formatAED(stats.pipelineValue)}</div><p className="text-xs text-muted-foreground">Pipeline Value</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{formatAED(stats.totalCommission)}</div><p className="text-xs text-muted-foreground">Total Commission</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.completedDeals}</div><p className="text-xs text-muted-foreground">Completed</p></CardContent></Card>
      </div>

      {/* Pipeline by Stage */}
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : deals.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No deals found</CardContent></Card>
      ) : (
        <div className="space-y-6">
          {DEAL_STAGES.filter(stage => deals.some(d => d.stage === stage)).map(stage => (
            <div key={stage}>
              <div className="flex items-center gap-2 mb-3">
                <Badge className={`${stageColors[stage]} text-sm`}>{stageLabels[stage]}</Badge>
                <span className="text-sm text-muted-foreground">
                  {deals.filter(d => d.stage === stage).length} deal{deals.filter(d => d.stage === stage).length !== 1 ? "s" : ""} &middot; {formatAED(deals.filter(d => d.stage === stage).reduce((s, d) => s + (d.agreed_price || d.offer_price || 0), 0))}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {deals.filter(d => d.stage === stage).map(deal => (
                  <Card key={deal.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{deal.deal_reference || "New Deal"}</p>
                          <p className="text-xs text-muted-foreground">{deal.lead_agent_name || "Unassigned"}</p>
                        </div>
                        <Badge variant="outline">{dealTypeLabels[deal.deal_type] || deal.deal_type}</Badge>
                      </div>

                      <div className="space-y-1">
                        {deal.asking_price && <p className="text-xs text-muted-foreground">Asking: {formatAED(deal.asking_price)}</p>}
                        {deal.offer_price && <p className="text-xs text-muted-foreground">Offer: {formatAED(deal.offer_price)}</p>}
                        {deal.agreed_price && <p className="text-sm font-semibold text-green-700">Agreed: {formatAED(deal.agreed_price)}</p>}
                      </div>

                      {/* RERA Compliance */}
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">RERA Forms</p>
                        <div className="flex flex-wrap gap-1">
                          {reraStatus(deal).map(check => (
                            <Badge key={check.label} variant="outline" className={`text-xs ${check.done ? "border-green-300 text-green-700" : "border-gray-200 text-gray-400"}`}>
                              {check.done ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                              {check.label}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Commission */}
                      {deal.commission_amount && (
                        <div className="flex items-center justify-between text-xs border-t pt-2">
                          <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Commission: {formatAED(deal.commission_amount)}</span>
                          <Badge variant={deal.commission_status === "paid" ? "default" : "outline"}>{deal.commission_status}</Badge>
                        </div>
                      )}

                      {/* Rental specific */}
                      {deal.deal_type === "rent" && deal.ejari_number && (
                        <p className="text-xs text-muted-foreground">Ejari: {deal.ejari_number}</p>
                      )}

                      {deal.expected_close_date && (
                        <p className="text-xs text-muted-foreground">Expected close: {new Date(deal.expected_close_date).toLocaleDateString()}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </RTLWrapper>
  );
}
