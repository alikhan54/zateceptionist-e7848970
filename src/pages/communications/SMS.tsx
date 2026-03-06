import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Plus,
  Send,
  Search,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Phone,
  User,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatSmartDate } from "@/lib/utils";

export default function SMSHub() {
  const { tenantId, tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState({ to: "", message: "" });

  // Query SMS conversations (UUID tenant_id via conversations table)
  const { data: conversations = [], isLoading: convsLoading, refetch: refetchConvs } = useQuery({
    queryKey: ["sms-conversations", tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("tenant_id", tenantConfig.id)
        .eq("channel", "sms")
        .order("last_message_at", { ascending: false })
        .limit(100);
      if (error) { console.error("[SMS] Conversations error:", error); return []; }
      return data || [];
    },
    enabled: !!tenantConfig?.id,
  });

  // Query sent SMS from outbound_messages (SLUG tenant_id)
  const { data: sentSMS = [] } = useQuery({
    queryKey: ["sms-sent", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("outbound_messages")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("channel", "sms")
        .order("sent_at", { ascending: false })
        .limit(50);
      if (error) { console.error("[SMS] Sent query error:", error); return []; }
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Query messages for selected conversation (UUID tenant_id)
  const { data: threadMessages = [], isLoading: threadLoading } = useQuery({
    queryKey: ["sms-thread", selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation?.id) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedConversation.id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) { console.error("[SMS] Thread error:", error); return []; }
      return data || [];
    },
    enabled: !!selectedConversation?.id,
  });

  // Real-time subscription for new messages
  useEffect(() => {
    if (!tenantConfig?.id) return;
    const channel = supabase
      .channel("sms-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `tenant_id=eq.${tenantConfig.id}`,
        },
        (payload) => {
          if ((payload.new as any)?.channel === "sms") {
            queryClient.invalidateQueries({ queryKey: ["sms-conversations", tenantConfig.id] });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          if (selectedConversation?.id) {
            queryClient.invalidateQueries({ queryKey: ["sms-thread", selectedConversation.id] });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantConfig?.id, selectedConversation?.id, queryClient]);

  const sentToday = sentSMS.filter((m: any) => {
    if (!m.sent_at && !m.created_at) return false;
    const d = new Date(m.sent_at || m.created_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  const totalConvs = conversations.length;
  const unreadConvs = conversations.filter((c: any) => (c.unread_count || 0) > 0).length;

  const filteredConversations = search
    ? conversations.filter((c: any) =>
        (c.last_message_text || "").toLowerCase().includes(search.toLowerCase()) ||
        (c.channel_conversation_id || "").toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedConversation) return;
    try {
      await fetch("https://webhooks.zatesystems.com/webhook/queue/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          channel: "sms",
          recipient_identifier: selectedConversation.channel_conversation_id,
          message_content: replyText,
          message_type: "reply",
          source_module: "communications",
          conversation_id: selectedConversation.id,
        }),
      });
      toast({ title: "Sent", description: "SMS reply queued." });
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["sms-thread", selectedConversation.id] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleCompose = async () => {
    if (!composeData.to || !composeData.message) {
      toast({ title: "Error", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    try {
      await fetch("https://webhooks.zatesystems.com/webhook/queue/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          channel: "sms",
          recipient_identifier: composeData.to,
          message_content: composeData.message,
          message_type: "manual",
          source_module: "communications",
        }),
      });
      toast({ title: "SMS Queued", description: `SMS to ${composeData.to} has been queued.` });
      setComposeOpen(false);
      setComposeData({ to: "", message: "" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SMS</h1>
          <p className="text-muted-foreground mt-1">Text message communications</p>
        </div>
        <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Message</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New SMS</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>To (Phone Number)</Label>
                <Input
                  placeholder="+1234567890"
                  value={composeData.to}
                  onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <textarea
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px]"
                  placeholder="Type your message..."
                  value={composeData.message}
                  onChange={(e) => setComposeData({ ...composeData, message: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
                <Button onClick={handleCompose}>
                  <Send className="h-4 w-4 mr-2" />Send SMS
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Send className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{sentToday}</p>
            <p className="text-sm text-muted-foreground">Sent Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <MessageSquare className="h-8 w-8 mx-auto text-chart-2 mb-2" />
            <p className="text-2xl font-bold">{totalConvs}</p>
            <p className="text-sm text-muted-foreground">Conversations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <MessageSquare className="h-8 w-8 mx-auto text-chart-4 mb-2" />
            <p className="text-2xl font-bold">{unreadConvs}</p>
            <p className="text-sm text-muted-foreground">Unread</p>
          </CardContent>
        </Card>
      </div>

      {/* Conversations + Thread View */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Conversation List */}
        <Card className={selectedConversation ? "md:col-span-1" : "md:col-span-3"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>SMS Conversations</CardTitle>
              <Button variant="outline" size="icon" onClick={() => refetchConvs()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {convsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground px-4">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No SMS conversations</p>
                  <p className="text-sm mt-1">Send an SMS to start a conversation</p>
                </div>
              ) : (
                filteredConversations.map((conv: any) => (
                  <div
                    key={conv.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 border-b ${
                      selectedConversation?.id === conv.id ? "bg-primary/5" : ""
                    }`}
                    onClick={() => setSelectedConversation(conv)}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                      <Phone className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">
                          {conv.channel_conversation_id || "Unknown"}
                        </p>
                        {(conv.unread_count || 0) > 0 && (
                          <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.last_message_text || "No messages"}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">
                        {conv.last_message_at ? formatSmartDate(conv.last_message_at) : ""}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Thread View */}
        {selectedConversation && (
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                  <User className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    {selectedConversation.channel_conversation_id || "Unknown"}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.status || "active"} · {threadMessages.length} messages
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] mb-4">
                {threadLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading messages...</div>
                ) : threadMessages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No messages in this conversation</div>
                ) : (
                  <div className="space-y-3 pr-4">
                    {threadMessages.map((msg: any) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-lg px-3 py-2 ${
                            msg.direction === "outbound"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <div className="flex items-center gap-1 mt-1">
                            {msg.direction === "outbound" ? (
                              <ArrowUpRight className="h-3 w-3 opacity-60" />
                            ) : (
                              <ArrowDownLeft className="h-3 w-3 opacity-60" />
                            )}
                            <p className="text-[10px] opacity-60">
                              {msg.created_at ? formatSmartDate(msg.created_at) : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <div className="flex gap-2">
                <Input
                  placeholder="Type a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                />
                <Button onClick={handleSendReply} disabled={!replyText.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
