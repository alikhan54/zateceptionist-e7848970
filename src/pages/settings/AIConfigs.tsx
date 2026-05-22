import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { Brain, Eye, Clock } from "lucide-react";

export default function AIConfigsPage() {
  const { tenantId, tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id || "";
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["ai_model_configs", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data, error } = await supabase
        .from("ai_model_configs" as any)
        .select("id, model_type, model_name, system_prompt, temperature, max_tokens, is_active, updated_at, created_at")
        .eq("tenant_id", tenantUuid)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantUuid,
  });

  const { data: invocationCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["agent_actions_counts", tenantId],
    queryFn: async () => {
      if (!tenantId) return {};
      const { data } = await supabase
        .from("agent_actions" as any)
        .select("agent_name")
        .eq("tenant_id", tenantId)
        .limit(1000);
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        const n = String(r.agent_name || "").toLowerCase();
        if (n) counts[n] = (counts[n] || 0) + 1;
      });
      return counts;
    },
    enabled: !!tenantId,
  });

  const { data: recentInvocations = [] } = useQuery({
    queryKey: ["agent_actions_recent", tenantId, selectedAgent],
    queryFn: async () => {
      if (!tenantId || !selectedAgent) return [];
      const { data } = await supabase
        .from("agent_actions" as any)
        .select("id, agent_name, tool_name, action_type, output_data, created_at")
        .eq("tenant_id", tenantId)
        .ilike("agent_name", selectedAgent)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!tenantId && !!selectedAgent,
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Brain className="h-7 w-7" /> AI Agent Configs
        </h1>
        <p className="text-muted-foreground">Read-only view of your AI agent configs and recent invocations.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-40 w-full" />)}</div>
      ) : configs.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No AI configs on file for this tenant.</p>
          <p className="text-xs mt-2">Agent prompts are managed via the platform's training pipeline.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="ai-configs-grid">
          {configs.map((c: any) => {
            const agentKey = (c.model_type || c.model_name || "").toLowerCase();
            const calls = invocationCounts[agentKey] || 0;
            return (
              <Card key={c.id} data-testid={`ai-config-${c.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{c.model_name || c.model_type}</CardTitle>
                    {c.is_active ? <Badge variant="default" className="text-[10px]">active</Badge> : <Badge variant="outline" className="text-[10px]">inactive</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Model type</span><span>{c.model_type || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Temperature</span><span>{c.temperature ?? "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Max tokens</span><span>{c.max_tokens ?? "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Invocations</span><span>{calls}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Last updated</span><span>{c.updated_at ? formatDate(c.updated_at, "medium") : "—"}</span></div>
                  {c.system_prompt && (
                    <div className="pt-2 border-t">
                      <div className="text-muted-foreground mb-1">System prompt (first 180 chars):</div>
                      <p className="line-clamp-3 text-foreground/80">{c.system_prompt.slice(0, 180)}{c.system_prompt.length > 180 ? "…" : ""}</p>
                    </div>
                  )}
                  <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => setSelectedAgent(c.model_type || c.model_name)} data-testid={`view-training-log-${c.id}`}>
                    <Eye className="h-3.5 w-3.5 mr-1.5" /> View training log
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedAgent} onOpenChange={(v) => !v && setSelectedAgent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="training-log-dialog">
          <DialogHeader>
            <DialogTitle>Recent invocations — {selectedAgent}</DialogTitle>
          </DialogHeader>
          {recentInvocations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No invocations recorded for this agent yet.</p>
          ) : (
            <div className="space-y-2">
              {recentInvocations.map((a: any) => (
                <Card key={a.id}>
                  <CardContent className="pt-3 pb-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px]">{a.action_type || "respond"}</Badge>
                      <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{a.created_at ? formatDate(a.created_at, "short") : ""}</span>
                    </div>
                    {a.tool_name && <p className="text-muted-foreground">tool: {a.tool_name}</p>}
                    {a.output_data?.response_preview && <p className="line-clamp-2 mt-1">{a.output_data.response_preview}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
