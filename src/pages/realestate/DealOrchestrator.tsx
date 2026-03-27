import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Workflow, Users, TrendingUp, AlertTriangle, CheckCircle, XCircle, Clock, Sparkles } from "lucide-react";
import { RTLWrapper } from "@/components/realestate/RTLWrapper";
import { useDealOrchestrator } from "@/hooks/useDealOrchestrator";
import { toast } from "sonner";

const stageLabels: Record<string, string> = {
  match_detected: "Match Found", presentation_ready: "Presentation Ready", presentation_sent: "Sent",
  viewing_proposed: "Viewing Proposed", viewing_scheduled: "Viewing Set", viewing_completed: "Viewed",
  followup_ready: "Follow-up Ready", followup_sent: "Follow-up Sent",
  offer_ready: "Offer Ready", offer_sent: "Offer Sent", negotiation: "Negotiating",
  deal_agreed: "Agreed", compliance_tracking: "Compliance", completed: "Closed",
  stalled: "Stalled", lost: "Lost"
};

const stageColors: Record<string, string> = {
  match_detected: "bg-blue-100 text-blue-800", presentation_ready: "bg-amber-100 text-amber-800",
  presentation_sent: "bg-sky-100 text-sky-800", viewing_scheduled: "bg-indigo-100 text-indigo-800",
  viewing_completed: "bg-purple-100 text-purple-800", followup_ready: "bg-amber-100 text-amber-800",
  offer_ready: "bg-amber-100 text-amber-800", negotiation: "bg-orange-100 text-orange-800",
  deal_agreed: "bg-emerald-100 text-emerald-800", completed: "bg-green-100 text-green-800",
  stalled: "bg-red-100 text-red-800", lost: "bg-gray-100 text-gray-600",
};

export default function DealOrchestrator() {
  const { orchestrations, isLoading, pendingApproval, stats, approve, isApproving } = useDealOrchestrator();
  const [reviewItem, setReviewItem] = useState<any>(null);
  const [agentNotes, setAgentNotes] = useState("");

  const handleApprove = async (action: "approve" | "reject") => {
    if (!reviewItem) return;
    try {
      await approve({ orchestration_id: reviewItem.id, action, agent_notes: agentNotes });
      toast.success(action === "approve" ? "Approved and sent!" : "Rejected — AI will regenerate");
      setReviewItem(null);
      setAgentNotes("");
    } catch { toast.error("Action failed"); }
  };

  const activeStages = ["presentation_ready", "presentation_sent", "viewing_scheduled", "viewing_completed", "followup_ready", "offer_ready", "negotiation", "deal_agreed", "compliance_tracking"];

  return (
    <RTLWrapper>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deal Orchestrator</h1>
          <p className="text-muted-foreground">AI-powered autonomous deal progression with human-in-the-loop approval</p>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
              <Workflow className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{isLoading ? "..." : stats.active}</div></CardContent>
          </Card>
          <Card className={stats.pendingApproval > 0 ? "border-amber-300 bg-amber-50/30" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Sparkles className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-amber-600">{isLoading ? "..." : stats.pendingApproval}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Probability</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{isLoading ? "..." : `${stats.avgProbability}%`}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stalled</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-red-600">{isLoading ? "..." : stats.stalled}</div></CardContent>
          </Card>
        </div>

        {/* Pending Approval Banner */}
        {pendingApproval.length > 0 && (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="p-4">
              <h3 className="font-medium flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-500" />AI Actions Awaiting Your Approval</h3>
              <div className="mt-3 space-y-2">
                {pendingApproval.map((o) => (
                  <div key={o.id} className="flex justify-between items-center bg-white p-3 rounded border">
                    <div>
                      <p className="font-medium">{o.client_name} — {o.listing_title}</p>
                      <p className="text-xs text-muted-foreground">{o.pending_action?.type?.replace(/_/g, " ")} • {o.closing_probability}% probability</p>
                    </div>
                    <Button size="sm" onClick={() => setReviewItem(o)}>Review & Approve</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pipeline Board */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading orchestrations...</div>
        ) : orchestrations.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No active deal orchestrations. High-score matches (80%+) from Auto-Matcher will appear here automatically.</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orchestrations.map((o) => (
              <Card key={o.id} className={`hover:shadow-md transition-shadow ${o.pending_action?.type && !o.agent_approved ? "ring-2 ring-amber-300" : ""} ${o.current_stage === "stalled" ? "border-red-300" : ""}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{o.client_name}</p>
                      <p className="text-xs text-muted-foreground">{o.listing_title}</p>
                    </div>
                    <Badge className={stageColors[o.current_stage] || ""}>{stageLabels[o.current_stage] || o.current_stage}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-bold">{o.closing_probability}%</span>
                    <span className="text-muted-foreground">closing probability</span>
                  </div>
                  {o.ai_next_action && <p className="text-xs text-blue-600">{o.ai_next_action}</p>}
                  {(o.ai_risk_factors || []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {o.ai_risk_factors.map((r, i) => <Badge key={i} variant="outline" className="text-xs text-red-600 border-red-200">{r}</Badge>)}
                    </div>
                  )}
                  {o.pending_action?.type && !o.agent_approved && (
                    <Button size="sm" variant="outline" className="w-full border-amber-300 text-amber-700" onClick={() => setReviewItem(o)}>
                      <Sparkles className="h-3 w-3 mr-1" />Review AI Action
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground"><Clock className="h-3 w-3 inline mr-1" />{new Date(o.updated_at).toLocaleDateString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Review Modal */}
        <Dialog open={!!reviewItem} onOpenChange={() => { setReviewItem(null); setAgentNotes(""); }}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Review AI-Generated Action</DialogTitle></DialogHeader>
            {reviewItem && (
              <div className="space-y-4">
                <div className="bg-muted/50 p-3 rounded">
                  <p className="font-medium">{reviewItem.client_name} — {reviewItem.listing_title}</p>
                  <p className="text-sm text-muted-foreground">Action: {reviewItem.pending_action?.type?.replace(/_/g, " ")}</p>
                  <p className="text-sm text-muted-foreground">Channel: {reviewItem.pending_action?.channel || "in-app"}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">AI Reasoning</h4>
                  <p className="text-sm text-muted-foreground">{reviewItem.pending_action?.ai_reasoning || "No reasoning provided"}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">Generated Content</h4>
                  <div className="bg-white border rounded p-3 text-sm whitespace-pre-wrap">
                    {typeof reviewItem.pending_action?.content === "object"
                      ? (reviewItem.pending_action.content.body || reviewItem.pending_action.content.body_text || JSON.stringify(reviewItem.pending_action.content, null, 2))
                      : (reviewItem.pending_action?.content || "No content")}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">Your Notes (optional)</h4>
                  <Textarea value={agentNotes} onChange={(e) => setAgentNotes(e.target.value)} placeholder="Add notes or modifications..." />
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => handleApprove("approve")} disabled={isApproving} className="flex-1 bg-green-600 hover:bg-green-700">
                    <CheckCircle className="h-4 w-4 mr-2" />Approve & Send
                  </Button>
                  <Button onClick={() => handleApprove("reject")} disabled={isApproving} variant="outline" className="flex-1 border-red-300 text-red-600">
                    <XCircle className="h-4 w-4 mr-2" />Reject & Regenerate
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RTLWrapper>
  );
}
