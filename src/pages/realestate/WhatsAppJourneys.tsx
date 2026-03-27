import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageCircle, Users, Globe, Phone, ChevronRight, UserCheck, Clock } from "lucide-react";
import { RTLWrapper } from "@/components/realestate/RTLWrapper";
import { useWhatsAppJourneys, WhatsAppJourney } from "@/hooks/useWhatsAppJourneys";
import { toast } from "sonner";

const stageLabels: Record<string, string> = {
  initial_contact: "First Contact", qualifying: "Qualifying", qualified: "Qualified",
  properties_shown: "Browsing", property_selected: "Selected", proposal_sent: "Proposal Sent",
  viewing_requested: "Wants Viewing", viewing_scheduled: "Viewing Set", post_viewing: "Post-Viewing",
  offer_discussion: "Discussing Offer", offer_submitted: "Offer Sent",
  agent_handoff: "Agent Handling", completed: "Done", dormant: "Dormant"
};

const stageColors: Record<string, string> = {
  initial_contact: "bg-blue-100 text-blue-800", qualifying: "bg-sky-100 text-sky-800",
  qualified: "bg-indigo-100 text-indigo-800", properties_shown: "bg-purple-100 text-purple-800",
  viewing_scheduled: "bg-green-100 text-green-800", agent_handoff: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-800", dormant: "bg-gray-100 text-gray-600",
};

function maskPhone(phone: string): string {
  if (phone.length < 8) return phone;
  return phone.substring(0, 4) + "****" + phone.substring(phone.length - 3);
}

export default function WhatsAppJourneys() {
  const { journeys, isLoading, stats, takeover } = useWhatsAppJourneys();
  const [selectedJourney, setSelectedJourney] = useState<WhatsAppJourney | null>(null);

  const handleTakeover = async (journeyId: string) => {
    try {
      await takeover({ journey_id: journeyId, reason: "Agent manual takeover" });
      toast.success("You've taken over this conversation");
      setSelectedJourney(null);
    } catch { toast.error("Takeover failed"); }
  };

  return (
    <RTLWrapper>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">WhatsApp Journeys</h1>
          <p className="text-muted-foreground">AI-powered buyer conversations — complete property discovery through WhatsApp</p>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Journeys</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{isLoading ? "..." : stats.total}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-600">{isLoading ? "..." : stats.active}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Qualified</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{isLoading ? "..." : stats.qualified}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Messages</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{isLoading ? "..." : stats.avgMessages}</div></CardContent>
          </Card>
        </div>

        {/* Journey List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading journeys...</div>
        ) : journeys.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            No WhatsApp journeys yet. When a buyer messages your WhatsApp number, AI will guide them through property discovery automatically.
            <p className="text-xs mt-2 text-amber-600">Note: WhatsApp integration requires configuring whatsapp_phone_id in tenant settings.</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {journeys.map((j) => (
              <Card key={j.id} className="cursor-pointer hover:shadow-md" onClick={() => setSelectedJourney(j)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">{j.buyer_name || maskPhone(j.whatsapp_number)}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Globe className="h-3 w-3" />{j.detected_language?.toUpperCase() || "EN"}
                        <span>{j.message_count} messages</span>
                        {j.last_message_at && <span>{new Date(j.last_message_at).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={stageColors[j.current_stage] || "bg-gray-100"}>{stageLabels[j.current_stage] || j.current_stage}</Badge>
                    {j.agent_takeover && <Badge variant="outline" className="text-amber-600 border-amber-300">Agent</Badge>}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Conversation Detail Dialog */}
        <Dialog open={!!selectedJourney} onOpenChange={() => setSelectedJourney(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-green-600" />
                {selectedJourney?.buyer_name || maskPhone(selectedJourney?.whatsapp_number || "")}
              </DialogTitle>
            </DialogHeader>
            {selectedJourney && (
              <div className="space-y-4">
                {/* Qualification Sidebar */}
                {Object.keys(selectedJourney.qualification_data || {}).length > 0 && (
                  <div className="bg-muted/50 p-3 rounded">
                    <h4 className="text-sm font-medium mb-2">Qualification Data</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {selectedJourney.qualification_data.budget_max && <div><span className="text-muted-foreground">Budget:</span> AED {Number(selectedJourney.qualification_data.budget_max).toLocaleString()}</div>}
                      {selectedJourney.qualification_data.nationality && <div><span className="text-muted-foreground">Nationality:</span> {selectedJourney.qualification_data.nationality}</div>}
                      {selectedJourney.qualification_data.purpose && <div><span className="text-muted-foreground">Purpose:</span> {selectedJourney.qualification_data.purpose}</div>}
                      {(selectedJourney.qualification_data.preferred_areas || []).length > 0 && <div className="col-span-2"><span className="text-muted-foreground">Areas:</span> {selectedJourney.qualification_data.preferred_areas.join(", ")}</div>}
                    </div>
                  </div>
                )}

                {/* Chat View */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {(selectedJourney.conversation_history || []).map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "buyer" ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === "buyer" ? "bg-gray-100" : msg.role === "agent" ? "bg-blue-100" : "bg-green-100"}`}>
                        <p className="text-xs text-muted-foreground mb-1">{msg.role === "buyer" ? "Buyer" : msg.role === "agent" ? "Agent" : "AI"} • {new Date(msg.timestamp).toLocaleTimeString()}</p>
                        <p>{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                {!selectedJourney.agent_takeover && selectedJourney.current_stage !== "completed" && (
                  <Button variant="outline" onClick={() => handleTakeover(selectedJourney.id)} className="w-full">
                    <UserCheck className="h-4 w-4 mr-2" />Take Over Conversation
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RTLWrapper>
  );
}
