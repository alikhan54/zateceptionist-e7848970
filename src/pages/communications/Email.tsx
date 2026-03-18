import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Mail,
  Plus,
  Inbox,
  Send,
  Search,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Settings2,
  ArrowUpRight,
  Megaphone,
} from "lucide-react";
import { EmailCampaigns } from "@/components/email-campaigns/EmailCampaigns";
import { useToast } from "@/hooks/use-toast";
import { formatSmartDate } from "@/lib/utils";

export default function EmailHub() {
  const { tenantId, tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"sent" | "compose" | "settings" | "campaigns">("sent");
  const [search, setSearch] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState({
    to: "",
    subject: "",
    body: "",
  });

  // Query sent emails from outbound_messages (SLUG tenant_id)
  const { data: sentEmails = [], isLoading: sentLoading, refetch: refetchSent } = useQuery({
    queryKey: ["email-sent", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("outbound_messages")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("channel", "email")
        .order("sent_at", { ascending: false })
        .limit(100);
      if (error) { console.error("[Email] Sent query error:", error); return []; }
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Query email conversations from conversations (UUID tenant_id)
  const { data: inboxConversations = [], isLoading: inboxLoading } = useQuery({
    queryKey: ["email-inbox", tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("tenant_id", tenantConfig.id)
        .eq("channel", "email")
        .order("last_message_at", { ascending: false })
        .limit(100);
      if (error) { console.error("[Email] Inbox query error:", error); return []; }
      return data || [];
    },
    enabled: !!tenantConfig?.id,
  });

  // Real-time subscription for new sent emails
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("email-outbound-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "outbound_messages",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          if ((payload.new as any).channel === "email") {
            queryClient.invalidateQueries({ queryKey: ["email-sent", tenantId] });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, queryClient]);

  const sentCount = sentEmails.length;
  const inboxCount = inboxConversations.length;
  const unreadCount = inboxConversations.filter((c: any) => (c.unread_count || 0) > 0).length;

  const filteredSent = search
    ? sentEmails.filter((e: any) =>
        (e.email_subject || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.recipient_identifier || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.content || "").toLowerCase().includes(search.toLowerCase())
      )
    : sentEmails;

  const filteredInbox = search
    ? inboxConversations.filter((c: any) =>
        (c.last_message_text || "").toLowerCase().includes(search.toLowerCase())
      )
    : inboxConversations;

  const statusBadge = (status: string) => {
    switch (status) {
      case "sent":
      case "delivered":
        return <Badge className="bg-green-500/10 text-green-600 border-0"><CheckCircle className="h-3 w-3 mr-1" />Sent</Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-600 border-0"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "pending":
      case "queued":
        return <Badge className="bg-amber-500/10 text-amber-600 border-0"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="secondary">{status || "Unknown"}</Badge>;
    }
  };

  // SMTP config from tenant_config
  const smtpConfigured = !!(tenantConfig?.smtp_host && tenantConfig?.smtp_from_email);

  const handleCompose = async () => {
    if (!composeData.to || !composeData.subject) {
      toast({ title: "Error", description: "Please fill in To and Subject fields.", variant: "destructive" });
      return;
    }
    try {
      const response = await fetch("https://webhooks.zatesystems.com/webhook/queue/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          channel: "email",
          recipient_identifier: composeData.to,
          subject: composeData.subject,
          message_content: composeData.body,
          message_type: "manual",
          source_module: "communications",
        }),
      });
      if (!response.ok) throw new Error("Failed to queue email");
      toast({ title: "Email Queued", description: `Email to ${composeData.to} has been queued for sending.` });
      setComposeOpen(false);
      setComposeData({ to: "", subject: "", body: "" });
      setTimeout(() => refetchSent(), 2000);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to send email", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email</h1>
          <p className="text-muted-foreground mt-1">Manage email communications</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={smtpConfigured ? "bg-green-500 text-white" : "bg-amber-500 text-white"}>
            {smtpConfigured ? "SMTP Connected" : "SMTP Not Configured"}
          </Badge>
          <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Compose</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Compose Email</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input
                    placeholder="recipient@example.com"
                    value={composeData.to}
                    onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    placeholder="Email subject"
                    value={composeData.subject}
                    onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Body</Label>
                  <textarea
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[200px]"
                    placeholder="Write your message..."
                    value={composeData.body}
                    onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
                  <Button onClick={handleCompose}>
                    <Send className="h-4 w-4 mr-2" />Send
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Inbox className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{inboxCount}</p>
            <p className="text-sm text-muted-foreground">Inbox Conversations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Send className="h-8 w-8 mx-auto text-chart-2 mb-2" />
            <p className="text-2xl font-bold">{sentCount}</p>
            <p className="text-sm text-muted-foreground">Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Mail className="h-8 w-8 mx-auto text-chart-4 mb-2" />
            <p className="text-2xl font-bold">{unreadCount}</p>
            <p className="text-sm text-muted-foreground">Unread</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex gap-1 -mb-px">
          {[
            { key: "sent" as const, label: "Sent Emails", icon: Send },
            { key: "campaigns" as const, label: "Campaigns", icon: Megaphone },
            { key: "settings" as const, label: "SMTP Settings", icon: Settings2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {activeTab === "sent" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Sent Emails</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search emails..."
                    className="pl-9 w-64"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="icon" onClick={() => refetchSent()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {sentLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredSent.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No emails sent yet</p>
                <p className="text-sm mt-1">Compose your first email to get started</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredSent.map((email: any) => (
                  <div key={email.id} className="flex items-center gap-4 py-3 px-2 hover:bg-muted/50 rounded-lg">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                      <Mail className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {email.email_subject || "(No Subject)"}
                        </p>
                        {statusBadge(email.status)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        To: {email.recipient_identifier || email.email_to || "Unknown"}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {email.sent_at ? formatSmartDate(email.sent_at) : email.created_at ? formatSmartDate(email.created_at) : "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "campaigns" && <EmailCampaigns />}

      {activeTab === "settings" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              SMTP Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SMTP Host</Label>
                <Input value={tenantConfig?.smtp_host || ""} disabled placeholder="Not configured" />
              </div>
              <div className="space-y-2">
                <Label>SMTP Port</Label>
                <Input value={tenantConfig?.smtp_port?.toString() || ""} disabled placeholder="Not configured" />
              </div>
              <div className="space-y-2">
                <Label>SMTP User</Label>
                <Input value={tenantConfig?.smtp_user || ""} disabled placeholder="Not configured" />
              </div>
              <div className="space-y-2">
                <Label>From Email</Label>
                <Input value={tenantConfig?.smtp_from_email || ""} disabled placeholder="Not configured" />
              </div>
              <div className="space-y-2">
                <Label>From Name</Label>
                <Input value={tenantConfig?.smtp_from_name || ""} disabled placeholder="Not configured" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              SMTP settings are managed in your tenant configuration. Contact support to update.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
