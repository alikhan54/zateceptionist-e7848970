import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ear, ThumbsUp, Minus, ThumbsDown, AlertTriangle, CheckCircle2, ExternalLink, MessageSquare, Sparkles, Ticket, UserCheck, Loader2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

// CX Recovery webhook (n8n, additive — separate from sacred 9)
const CX_RECOVERY_WEBHOOK = "https://webhooks.zatesystems.com/webhook/cx-recovery";

interface RecoveryAction {
  id: string;
  tenant_id: string;
  review_id: string | null;
  mention_id: string | null;
  status: "pending" | "contacted" | "resolved" | "dismissed";
  action_type: string | null;
  channel: string | null;
  language: string | null;
  ai_message: string | null;
  incentive_code: string | null;
  incentive_value: number | null;
  incentive_currency: string | null;
  manager_name: string | null;
  manager_alerted_at: string | null;
  contacted_at: string | null;
  resolved_at: string | null;
  triggered_by: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export default function SocialListening() {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [recoveringId, setRecoveringId] = useState<string | null>(null);

  const { data: mentions = [], isLoading } = useQuery({
    queryKey: ["social_mentions", tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig) return [];
      const { data } = await supabase
        .from("social_mentions")
        .select("*")
        .eq("tenant_id", tenantConfig.id)
        .order("discovered_at", { ascending: false })
        .limit(200);
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  // CX Recovery actions — the new tab + per-mention overlay
  const { data: recoveries = [] } = useQuery({
    queryKey: ["cx_recovery_actions", tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig) return [] as RecoveryAction[];
      const { data } = await supabase
        .from("cx_recovery_actions")
        .select("*")
        .eq("tenant_id", tenantConfig.id)
        .order("created_at", { ascending: false })
        .limit(200);
      return (data || []) as RecoveryAction[];
    },
    enabled: !!tenantConfig,
  });

  const recoveryByMention = useMemo(() => {
    const m: Record<string, RecoveryAction> = {};
    for (const r of recoveries) if (r.mention_id) m[r.mention_id] = r;
    return m;
  }, [recoveries]);

  const triggerRecovery = useMutation({
    mutationFn: async (mention: any) => {
      if (!tenantConfig?.tenant_id) throw new Error("No tenant");
      setRecoveringId(mention.id);
      const res = await fetch(CX_RECOVERY_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_slug: tenantConfig.tenant_id,
          tenant_uuid: tenantConfig.id,
          mention_id: mention.id,
          triggered_by: "manual",
        }),
      });
      if (!res.ok) throw new Error(`Recovery failed (${res.status})`);
      return res.json();
    },
    onSuccess: (data: any) => {
      const voucher = data?.voucher || "issued";
      const mgr = data?.manager_name || "manager";
      toast({
        title: "Recovery action sent",
        description: `Apology drafted in ${data?.language || "en"} · voucher ${voucher} · alert to ${mgr}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["social_mentions"] });
      queryClient.invalidateQueries({ queryKey: ["cx_recovery_actions"] });
    },
    onError: (e: any) => {
      toast({ title: "Recovery failed", description: e?.message || "Try again", variant: "destructive" });
    },
    onSettled: () => setRecoveringId(null),
  });

  // legacy "Marked as responded" preserved for completeness (no longer the primary action)
  const markResponded = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("social_mentions").update({ responded: true }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social_mentions"] });
      toast({ title: "Marked as responded" });
    },
  });

  const filtered = useMemo(() => {
    if (activeTab === "all") return mentions;
    if (activeTab === "needs_response") return mentions.filter((m: any) => m.requires_response && !m.responded);
    if (activeTab === "recovery") return [];
    return mentions.filter((m: any) => m.sentiment === activeTab);
  }, [mentions, activeTab]);

  const stats = useMemo(() => {
    const total = mentions.length;
    const positive = mentions.filter((m: any) => m.sentiment === "positive").length;
    const negative = mentions.filter((m: any) => m.sentiment === "negative").length;
    const needsResponse = mentions.filter((m: any) => m.requires_response && !m.responded).length;
    const responded = mentions.filter((m: any) => m.requires_response && m.responded).length;
    const responseRate = (needsResponse + responded) > 0 ? Math.round((responded / (needsResponse + responded)) * 100) : 100;
    const recovered = recoveries.length;
    const recoveryPending = recoveries.filter((r) => r.status === "pending" || r.status === "contacted").length;
    return { total, positive, negative, needsResponse, responseRate, recovered, recoveryPending };
  }, [mentions, recoveries]);

  // 7-day sentiment chart data
  const chartData = useMemo(() => {
    const days: Record<string, { positive: number; neutral: number; negative: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      days[key] = { positive: 0, neutral: 0, negative: 0 };
    }
    for (const m of mentions) {
      const key = (m.discovered_at || m.created_at || "").split("T")[0];
      if (days[key] && m.sentiment) days[key][m.sentiment as keyof typeof days[string]]++;
    }
    return Object.entries(days).map(([date, counts]) => ({ date, ...counts, total: counts.positive + counts.neutral + counts.negative }));
  }, [mentions]);

  const maxTotal = Math.max(1, ...chartData.map(d => d.total));

  const sentimentIcon = (s: string) => {
    if (s === "positive") return <ThumbsUp className="h-4 w-4 text-green-500" />;
    if (s === "negative") return <ThumbsDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const recoveryStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-amber-100 text-amber-700",
      contacted: "bg-blue-100 text-blue-700",
      resolved: "bg-green-100 text-green-700",
      dismissed: "bg-gray-100 text-gray-700",
    };
    return <Badge className={`${map[status] || "bg-gray-100 text-gray-700"} text-xs`}>{status}</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Ear className="h-6 w-6" /> Social Listening & CX Recovery</h1>
          <p className="text-muted-foreground">Monitor mentions across the web — recover unhappy guests automatically</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total Mentions</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.total > 0 ? Math.round((stats.positive / stats.total) * 100) : 0}%</p>
          <p className="text-xs text-muted-foreground">Positive</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.total > 0 ? Math.round((stats.negative / stats.total) * 100) : 0}%</p>
          <p className="text-xs text-muted-foreground">Negative</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold">{stats.responseRate}%</p>
          <p className="text-xs text-muted-foreground">Response Rate</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold flex items-center justify-center gap-1"><Sparkles className="h-4 w-4 text-violet-500" />{stats.recovered}</p>
          <p className="text-xs text-muted-foreground">Recoveries</p>
        </CardContent></Card>
      </div>

      {/* Sentiment Chart */}
      <Card>
        <CardHeader><CardTitle className="text-sm">7-Day Sentiment Trend</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32">
            {chartData.map(d => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col gap-0.5" style={{ height: `${(d.total / maxTotal) * 100}%`, minHeight: d.total > 0 ? "4px" : "0" }}>
                  {d.positive > 0 && <div className="bg-green-400 rounded-sm" style={{ height: `${(d.positive / d.total) * 100}%` }} />}
                  {d.neutral  > 0 && <div className="bg-gray-300 rounded-sm" style={{ height: `${(d.neutral  / d.total) * 100}%` }} />}
                  {d.negative > 0 && <div className="bg-red-400 rounded-sm" style={{ height: `${(d.negative / d.total) * 100}%` }} />}
                </div>
                <span className="text-[10px] text-muted-foreground">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-3">
            <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 bg-green-400 rounded" /> Positive</span>
            <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 bg-gray-300 rounded" /> Neutral</span>
            <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 bg-red-400 rounded" /> Negative</span>
          </div>
        </CardContent>
      </Card>

      {/* Mention Feed + Recovery Timeline */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" data-testid="cx-tab-all">All ({mentions.length})</TabsTrigger>
          <TabsTrigger value="positive">Positive</TabsTrigger>
          <TabsTrigger value="neutral">Neutral</TabsTrigger>
          <TabsTrigger value="negative" data-testid="cx-tab-negative">Negative</TabsTrigger>
          <TabsTrigger value="needs_response">
            Needs Response {stats.needsResponse > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5">{stats.needsResponse}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="recovery" data-testid="cx-tab-recovery">
            Recovery {stats.recovered > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{stats.recovered}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Recovery timeline */}
        <TabsContent value="recovery" className="mt-4 space-y-3">
          {recoveries.length === 0 ? (
            <Card data-testid="cx-recovery-empty"><CardContent className="py-12 text-center text-muted-foreground">
              <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No recovery actions yet. Click "Recover" on a negative mention to fire your first one.</p>
            </CardContent></Card>
          ) : (
            <div data-testid="cx-recovery-timeline">
              {recoveries.map((r) => (
                <Card key={r.id} data-testid={`cx-recovery-row-${r.id}`} className="mb-3 border-l-4 border-l-violet-400">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {recoveryStatusBadge(r.status)}
                          {r.action_type && <Badge variant="outline" className="text-xs">{r.action_type}</Badge>}
                          {r.channel && <Badge variant="secondary" className="text-xs">{r.channel}</Badge>}
                          {r.language && <Badge variant="outline" className="text-xs">{r.language}</Badge>}
                          {r.triggered_by === "manual" && <Badge variant="outline" className="text-xs">manual</Badge>}
                        </div>
                        <div className="text-sm space-y-1">
                          {r.metadata?.customer_name && (
                            <p><span className="text-muted-foreground">Guest:</span> {r.metadata.customer_name} ({r.metadata.platform || "social"})</p>
                          )}
                          {r.metadata?.review_excerpt && (
                            <p className="text-xs text-muted-foreground italic line-clamp-2">"{r.metadata.review_excerpt}"</p>
                          )}
                          {r.ai_message && (
                            <details className="mt-2">
                              <summary className="text-xs cursor-pointer text-violet-600">View apology message ({r.language})</summary>
                              <p className="mt-2 text-xs bg-violet-50 p-3 rounded whitespace-pre-wrap">{r.ai_message}</p>
                            </details>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {r.incentive_code && (
                            <span className="flex items-center gap-1"><Ticket className="h-3 w-3" /> <code className="font-mono">{r.incentive_code}</code> · {r.incentive_value}% off</span>
                          )}
                          {r.manager_name && (
                            <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" /> Alert to {r.manager_name}</span>
                          )}
                          {r.created_at && (
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Mentions list (other tabs) */}
        <TabsContent value={activeTab} className="mt-4 space-y-3" hidden={activeTab === "recovery"}>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading mentions...</p>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No mentions found. The Social Listener runs every 4 hours to discover new mentions.</p>
            </CardContent></Card>
          ) : (
            filtered.map((m: any) => {
              const recovery = recoveryByMention[m.id];
              const isRecoverable = (m.sentiment === "negative" || m.requires_response) && !recovery;
              const isLoading = recoveringId === m.id && triggerRecovery.isPending;
              return (
                <Card key={m.id} data-testid={`cx-mention-${m.id}`} className={m.requires_response && !m.responded ? "border-l-4 border-l-amber-400" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {sentimentIcon(m.sentiment)}
                          <Badge variant="outline" className="text-xs">{m.matched_term}</Badge>
                          <Badge variant="secondary" className="text-xs">{m.mention_type}</Badge>
                          {m.requires_response && !m.responded && !recovery && (
                            <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" /> Needs Response</Badge>
                          )}
                          {recovery && (
                            <Badge data-testid={`cx-mention-${m.id}-recovered`} className="bg-violet-100 text-violet-700 text-xs">
                              <Sparkles className="h-3 w-3 mr-1" /> Recovered · {recovery.incentive_code}
                            </Badge>
                          )}
                          {m.responded && !recovery && (
                            <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" /> Responded</Badge>
                          )}
                        </div>
                        <p className="font-medium text-sm truncate">{m.title || m.author || "Untitled"}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.content}</p>
                        <p className="text-[11px] text-muted-foreground mt-2">
                          {m.discovered_at ? formatDistanceToNow(new Date(m.discovered_at), { addSuffix: true }) : ""}
                          {m.author ? ` · by ${m.author}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0 min-w-[110px]">
                        {m.source_url && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={m.source_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a>
                          </Button>
                        )}
                        {isRecoverable && (
                          <Button
                            size="sm"
                            data-testid={`cx-recover-${m.id}`}
                            disabled={isLoading}
                            onClick={() => triggerRecovery.mutate(m)}
                            className="bg-violet-600 hover:bg-violet-700 text-white"
                          >
                            {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                            {isLoading ? "Recovering…" : "Recover"}
                          </Button>
                        )}
                        {m.requires_response && !m.responded && !isRecoverable && (
                          <Button size="sm" variant="outline" onClick={() => markResponded.mutate(m.id)}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Done
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
