// ============================================================================
// DashboardBriefing.tsx — AI-Powered Morning Briefing for Sales Dashboard
// Queries real data from Supabase and generates actionable insights
// Shows empty state when no data is available — NEVER fake data
// ============================================================================

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  Target,
  Clock,
  Zap,
} from "lucide-react";

interface BriefingInsight {
  type: "action" | "metric" | "warning" | "success";
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
}

export default function DashboardBriefing() {
  const { tenantId, tenantConfig } = useTenant();

  // Fetch pipeline data
  const { data: leads } = useQuery({
    queryKey: ["briefing-leads", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("sales_leads")
        .select("lead_status, lead_score, enrichment_status, sequence_status, pipeline_stage, updated_at")
        .eq("tenant_id", tenantId);
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  // Fetch recent deals
  const { data: deals } = useQuery({
    queryKey: ["briefing-deals", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("deals")
        .select("stage, value, probability, ai_close_probability, updated_at")
        .eq("tenant_id", tenantId);
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch recent AI learnings
  const { data: learnings } = useQuery({
    queryKey: ["briefing-learnings", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_learning_store")
        .select("agent_name, learning_type, insight, confidence, created_at")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch recent outbound messages
  const { data: messages } = useQuery({
    queryKey: ["briefing-messages", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("outbound_messages")
        .select("channel, status, created_at")
        .eq("tenant_id", tenantId)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  // Generate insights from real data
  const insights: BriefingInsight[] = useMemo(() => {
    const result: BriefingInsight[] = [];
    if (!leads || leads.length === 0) return result;

    // Pipeline health
    const newLeads = leads.filter((l) => l.lead_status === "new").length;
    const enrichedLeads = leads.filter((l) => l.enrichment_status === "enriched" || l.enrichment_status === "completed").length;
    const activeSequences = leads.filter((l) => l.sequence_status === "active").length;
    const hotLeads = leads.filter((l) => l.lead_score && l.lead_score >= 70).length;
    const stuckLeads = leads.filter((l) => {
      if (!l.updated_at) return false;
      const daysSinceUpdate = (Date.now() - new Date(l.updated_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate > 7 && l.lead_status !== "converted" && l.lead_status !== "lost";
    }).length;

    // Hot leads action
    if (hotLeads > 0) {
      result.push({
        type: "action",
        title: `${hotLeads} hot lead${hotLeads > 1 ? "s" : ""} need attention`,
        detail: "High-scoring leads in your pipeline. Consider prioritizing outreach.",
        priority: "high",
      });
    }

    // Stuck leads warning
    if (stuckLeads > 3) {
      result.push({
        type: "warning",
        title: `${stuckLeads} leads haven't moved in 7+ days`,
        detail: "Review stalled leads — they may need follow-up or re-engagement.",
        priority: "medium",
      });
    }

    // Active sequences metric
    if (activeSequences > 0) {
      result.push({
        type: "metric",
        title: `${activeSequences} active sequence${activeSequences > 1 ? "s" : ""} running`,
        detail: `${enrichedLeads} enriched leads being worked through automated outreach.`,
        priority: "low",
      });
    }

    // New leads needing enrichment
    if (newLeads > 5) {
      result.push({
        type: "action",
        title: `${newLeads} new leads awaiting processing`,
        detail: "Enrichment pipeline will process these automatically on next cycle.",
        priority: "medium",
      });
    }

    // Deal pipeline
    if (deals && deals.length > 0) {
      const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
      const closingDeals = deals.filter((d) => d.stage === "negotiation" || d.stage === "closed_won").length;
      if (totalValue > 0) {
        result.push({
          type: "metric",
          title: `$${totalValue.toLocaleString()} in deal pipeline`,
          detail: `${deals.length} active deal${deals.length > 1 ? "s" : ""}${closingDeals > 0 ? `, ${closingDeals} in closing stage` : ""}.`,
          priority: "low",
        });
      }
    }

    // Messages sent today
    if (messages && messages.length > 0) {
      const sent = messages.filter((m) => m.status === "sent").length;
      result.push({
        type: "success",
        title: `${sent} message${sent > 1 ? "s" : ""} sent in last 24h`,
        detail: `Across ${[...new Set(messages.map((m) => m.channel))].join(", ")} channels.`,
        priority: "low",
      });
    }

    return result;
  }, [leads, deals, messages]);

  // Don't render if no data at all
  const hasData = (leads && leads.length > 0) || (deals && deals.length > 0);
  if (!hasData) {
    return (
      <Card className="mb-6 border-dashed border-purple-200 bg-purple-50/30">
        <CardContent className="py-6 text-center text-muted-foreground">
          <Sparkles className="h-8 w-8 mx-auto mb-2 text-purple-300" />
          <p className="text-sm">Your AI briefing will appear once leads and deals are active.</p>
        </CardContent>
      </Card>
    );
  }

  const iconMap = {
    action: <Zap className="h-4 w-4 text-amber-500" />,
    metric: <TrendingUp className="h-4 w-4 text-blue-500" />,
    warning: <AlertCircle className="h-4 w-4 text-red-500" />,
    success: <CheckCircle className="h-4 w-4 text-green-500" />,
  };

  const priorityColor = {
    high: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-gray-100 text-gray-600",
  };

  return (
    <Card className="mb-6 border-purple-200 bg-gradient-to-r from-purple-50/50 to-indigo-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI Briefing
          <Badge variant="secondary" className="text-xs font-normal">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.length > 0 ? (
          insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg bg-white/60 p-3">
              <div className="mt-0.5">{iconMap[insight.type]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{insight.title}</span>
                  <Badge className={`text-[10px] px-1.5 py-0 ${priorityColor[insight.priority]}`}>
                    {insight.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{insight.detail}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            No actionable insights right now. Check back after your pipeline updates.
          </p>
        )}

        {/* AI Learnings section */}
        {learnings && learnings.length > 0 && (
          <div className="mt-4 pt-3 border-t border-purple-100">
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-xs font-medium text-purple-600">Recent AI Learnings</span>
            </div>
            {learnings.slice(0, 3).map((l, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground mb-1.5">
                <span className="text-purple-400 mt-0.5">&#x2022;</span>
                <span>{l.insight.length > 120 ? l.insight.substring(0, 120) + "..." : l.insight}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
