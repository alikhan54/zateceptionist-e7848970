import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ear, ThumbsUp, Minus, ThumbsDown, AlertTriangle, CheckCircle2, ExternalLink, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export default function SocialListening() {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");

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
    return mentions.filter((m: any) => m.sentiment === activeTab);
  }, [mentions, activeTab]);

  const stats = useMemo(() => {
    const total = mentions.length;
    const positive = mentions.filter((m: any) => m.sentiment === "positive").length;
    const negative = mentions.filter((m: any) => m.sentiment === "negative").length;
    const needsResponse = mentions.filter((m: any) => m.requires_response && !m.responded).length;
    const responded = mentions.filter((m: any) => m.requires_response && m.responded).length;
    const responseRate = (needsResponse + responded) > 0 ? Math.round((responded / (needsResponse + responded)) * 100) : 100;
    return { total, positive, negative, needsResponse, responseRate };
  }, [mentions]);

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

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Ear className="h-6 w-6" /> Social Listening</h1>
          <p className="text-muted-foreground">Monitor brand and competitor mentions across the web</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      </div>

      {/* Sentiment Chart */}
      <Card>
        <CardHeader><CardTitle className="text-sm">7-Day Sentiment Trend</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32">
            {chartData.map(d => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col gap-0.5" style={{ height: `${(d.total / maxTotal) * 100}%`, minHeight: d.total > 0 ? "4px" : "0" }}>
                  {d.positive > 0 && <div className="bg-green-400 rounded-t" style={{ flex: d.positive }} />}
                  {d.neutral > 0 && <div className="bg-gray-300" style={{ flex: d.neutral }} />}
                  {d.negative > 0 && <div className="bg-red-400 rounded-b" style={{ flex: d.negative }} />}
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(d.date).toLocaleDateString("en", { weekday: "short" })}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-3 justify-center">
            <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 bg-green-400 rounded" /> Positive</span>
            <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 bg-gray-300 rounded" /> Neutral</span>
            <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 bg-red-400 rounded" /> Negative</span>
          </div>
        </CardContent>
      </Card>

      {/* Mention Feed */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({mentions.length})</TabsTrigger>
          <TabsTrigger value="positive">Positive</TabsTrigger>
          <TabsTrigger value="neutral">Neutral</TabsTrigger>
          <TabsTrigger value="negative">Negative</TabsTrigger>
          <TabsTrigger value="needs_response">
            Needs Response {stats.needsResponse > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5">{stats.needsResponse}</Badge>}
          </TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-4 space-y-3">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading mentions...</p>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No mentions found. The Social Listener runs every 4 hours to discover new mentions.</p>
            </CardContent></Card>
          ) : (
            filtered.map((m: any) => (
              <Card key={m.id} className={m.requires_response && !m.responded ? "border-l-4 border-l-amber-400" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {sentimentIcon(m.sentiment)}
                        <Badge variant="outline" className="text-xs">{m.matched_term}</Badge>
                        <Badge variant="secondary" className="text-xs">{m.mention_type}</Badge>
                        {m.requires_response && !m.responded && (
                          <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" /> Needs Response</Badge>
                        )}
                        {m.responded && (
                          <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" /> Responded</Badge>
                        )}
                      </div>
                      <p className="font-medium text-sm truncate">{m.title || "Untitled"}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.content}</p>
                      <p className="text-[11px] text-muted-foreground mt-2">
                        {m.discovered_at ? formatDistanceToNow(new Date(m.discovered_at), { addSuffix: true }) : ""}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {m.source_url && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={m.source_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a>
                        </Button>
                      )}
                      {m.requires_response && !m.responded && (
                        <Button size="sm" variant="outline" onClick={() => markResponded.mutate(m.id)}>
                          <CheckCircle2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
