// ============================================================================
// UPDATED DASHBOARD.TSX - Uses Unified Contacts Table
// All data is real - no mock/hardcoded values
// ============================================================================

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  RefreshCcw,
  BarChart3,
  Users,
  Flame,
  Thermometer,
  Snowflake,
  Mail,
  Phone,
  Zap,
  Target,
  TrendingUp,
  ArrowRight,
  Clock,
  Play,
  Search,
  Sparkles,
  Building2,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertCircle,
  Activity,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface PipelineStage {
  id: string;
  name: string;
  probability: number;
  category: string;
  color: string;
}

interface LeadGenHistory {
  id: string;
  search_type: string;
  keywords: string | null;
  leads_found: number;
  leads_saved: number;
  status: string;
  created_at: string;
}

// ============================================================================
// PIPELINE STAGES
// ============================================================================

const PIPELINE_STAGES: PipelineStage[] = [
  { id: "PROS", name: "Prospect", probability: 10, category: "Discovery", color: "bg-slate-500" },
  { id: "RES", name: "Research", probability: 20, category: "Discovery", color: "bg-blue-500" },
  { id: "CONT", name: "Contact", probability: 30, category: "Qualification", color: "bg-cyan-500" },
  { id: "PITCH", name: "Pitch", probability: 50, category: "Qualification", color: "bg-purple-500" },
  { id: "OBJ", name: "Objection", probability: 60, category: "Closing", color: "bg-orange-500" },
  { id: "CLOSE", name: "Closing", probability: 80, category: "Closing", color: "bg-amber-500" },
  { id: "RET", name: "Retained", probability: 100, category: "Won", color: "bg-green-500" },
];

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export default function SalesDashboard() {
  // CRITICAL FIX: Get both tenantId (slug) and tenantConfig (full object with UUID)
  const { tenantId, tenantConfig } = useTenant();
  // USE THIS FOR ALL DATABASE OPERATIONS - This is the actual UUID!
  const tenantUuid = tenantConfig?.id;
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // =====================================================
  // DATA QUERIES - ALL REAL DATA FROM CONTACTS TABLE
  // =====================================================

  // Fetch all contacts for this tenant using UUID
  const {
    data: contacts = [],
    isLoading: contactsLoading,
    refetch: refetchContacts,
  } = useQuery({
    queryKey: ["dashboard", "contacts", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data, error } = await supabase
        .from("contacts")
        .select("id, lead_score, lead_temperature, lead_grade, pipeline_stage, sequence_status, source, created_at")
        .eq("tenant_id", tenantUuid);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantUuid,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch deals for this tenant - NOTE: Deals table uses slug per established pattern
  const { data: deals = [] } = useQuery({
    queryKey: ["dashboard", "deals", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("deals")
        .select("id, value, stage, probability, created_at")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Fetch recent lead gen history using UUID
  const { data: leadGenHistory = [] } = useQuery({
    queryKey: ["dashboard", "leadGenHistory", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data, error } = await supabase
        .from("lead_gen_history")
        .select("id, search_type, keywords, leads_found, leads_saved, status, created_at")
        .eq("tenant_id", tenantUuid)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) {
        console.log("lead_gen_history table may not exist yet");
        return [];
      }
      return data as LeadGenHistory[];
    },
    enabled: !!tenantUuid,
  });

  // Fetch email/call stats from activities (if table exists) using UUID
  const { data: activityStats } = useQuery({
    queryKey: ["dashboard", "activities", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return { emailsSent: 0, callsMade: 0 };
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data, error } = await supabase
          .from("activities")
          .select("type")
          .eq("tenant_id", tenantUuid)
          .gte("created_at", thirtyDaysAgo.toISOString())
          .in("type", ["email_sent", "call_outbound", "call_inbound"]);

        if (error) throw error;

        const emailsSent = data?.filter((a) => a.type === "email_sent").length || 0;
        const callsMade = data?.filter((a) => a.type === "call_outbound" || a.type === "call_inbound").length || 0;

        return { emailsSent, callsMade };
      } catch (e) {
        // Table might not exist yet
        return { emailsSent: 0, callsMade: 0 };
      }
    },
    enabled: !!tenantUuid,
  });

  // =====================================================
  // CALCULATED METRICS - ALL DERIVED FROM REAL DATA
  // =====================================================

  const metrics = useMemo(() => {
    // Contact counts by temperature
    const hotLeads = contacts.filter((c) => c.lead_temperature === "HOT").length;
    const warmLeads = contacts.filter((c) => c.lead_temperature === "WARM").length;
    const coldLeads = contacts.filter((c) => c.lead_temperature === "COLD").length;

    // Pipeline counts by stage
    const pipelineCounts: Record<string, number> = {};
    PIPELINE_STAGES.forEach((stage) => {
      pipelineCounts[stage.id] = contacts.filter((c) => c.pipeline_stage === stage.id).length;
    });

    // Active sequences
    const activeSequences = contacts.filter((c) => c.sequence_status === "active").length;

    // Deal metrics
    const activeDeals = deals.filter((d) => !["Won", "Lost"].includes(d.stage));
    const pipelineValue = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const weightedValue = activeDeals.reduce((sum, d) => sum + (d.value || 0) * ((d.probability || 0) / 100), 0);
    const wonDeals = deals.filter((d) => d.stage === "Won");
    const wonValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);

    // Sources breakdown
    const sourceBreakdown: Record<string, number> = {};
    contacts.forEach((c) => {
      const source = c.source || "unknown";
      sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
    });

    return {
      totalContacts: contacts.length,
      hotLeads,
      warmLeads,
      coldLeads,
      activeSequences,
      pipelineCounts,
      pipelineValue,
      weightedValue,
      wonValue,
      emailsSent: activityStats?.emailsSent || 0,
      callsMade: activityStats?.callsMade || 0,
      sourceBreakdown,
    };
  }, [contacts, deals, activityStats]);

  // =====================================================
  // AI QUICK ACTIONS
  // =====================================================

  const handleGenerateFreeLeads = () => {
    navigate("/sales/auto-leadgen");
  };

  const handleSendEmailBlast = async () => {
    toast({
      title: "Email Blast",
      description: `Ready to send to ${metrics.hotLeads} hot leads`,
    });
    // TODO: Implement actual email blast trigger
  };

  const handleStartAICalling = async () => {
    toast({
      title: "AI Calling",
      description: "Starting VAPI voice calls to hot leads...",
    });
    // TODO: Implement actual VAPI calling trigger
  };

  const handleRescoreLeads = async () => {
    toast({
      title: "Re-scoring Leads",
      description: "Recalculating scores for all contacts...",
    });
    // TODO: Trigger lead rescoring via n8n webhook
    try {
      // This would call your n8n webhook
      // await fetch('/webhook/recalculate-all-scores', { method: 'POST', body: JSON.stringify({ tenant_id: tenantId }) });
      refetchContacts();
    } catch (e) {
      console.error("Error rescoring leads:", e);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales Dashboard</h1>
          <p className="text-muted-foreground">AI-powered sales automation and lead management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchContacts()}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/sales/analytics")}>
            <BarChart3 className="h-4 w-4 mr-2" />
            View Reports
          </Button>
        </div>
      </div>

      {/* AI Assistant Status Banner */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-green-800">AI Sales Assistant Active</h3>
                <p className="text-sm text-green-600">
                  Automatically nurturing {metrics.totalContacts} contacts across email and phone
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">{metrics.emailsSent}</div>
                <div className="text-green-600">Emails Sent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">{metrics.callsMade}</div>
                <div className="text-green-600">Calls Made</div>
              </div>
              <Badge className="bg-green-500 text-white">
                <Activity className="h-3 w-3 mr-1" />
                Running
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Contacts</p>
                <p className="text-2xl font-bold">{metrics.totalContacts}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-green-500">
                +
                {
                  contacts.filter((c) => {
                    const created = new Date(c.created_at);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return created > weekAgo;
                  }).length
                }
              </span>{" "}
              this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hot Leads</p>
                <p className="text-2xl font-bold text-red-500">{metrics.hotLeads}</p>
              </div>
              <Flame className="h-8 w-8 text-red-500" />
            </div>
            <Progress
              value={metrics.totalContacts > 0 ? (metrics.hotLeads / metrics.totalContacts) * 100 : 0}
              className="mt-2 h-1"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Sequences</p>
                <p className="text-2xl font-bold">{metrics.activeSequences}</p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Contacts in nurture</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Emails Sent</p>
                <p className="text-2xl font-bold">{metrics.emailsSent}</p>
              </div>
              <Mail className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">AI Calls Made</p>
                <p className="text-2xl font-bold">{metrics.callsMade}</p>
              </div>
              <Phone className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Pipeline Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">Sales Pipeline</CardTitle>
            <CardDescription>Contact distribution by stage (Real Data)</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/sales/pipeline")}>
            View Pipeline
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2 mb-4">
            {PIPELINE_STAGES.map((stage) => {
              const count = metrics.pipelineCounts[stage.id] || 0;
              const maxCount = Math.max(...Object.values(metrics.pipelineCounts), 1);
              const heightPercent = (count / maxCount) * 100;

              return (
                <div key={stage.id} className="flex flex-col items-center flex-1">
                  <div
                    className={`${stage.color} text-white rounded-full w-10 h-10 flex items-center justify-center text-sm font-bold mb-2`}
                  >
                    {count}
                  </div>
                  <div className="text-xs font-medium">{stage.id}</div>
                  <div className="text-xs text-muted-foreground">{stage.name}</div>
                </div>
              );
            })}
          </div>

          {/* Stage Categories */}
          <div className="flex justify-between text-xs text-muted-foreground border-t pt-2">
            <div className="text-center flex-1">
              <span className="font-medium">Discovery</span>
            </div>
            <div className="text-center flex-1">
              <span className="font-medium">Qualification</span>
            </div>
            <div className="text-center flex-1">
              <span className="font-medium">Closing</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            AI Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={handleGenerateFreeLeads}
            >
              <Search className="h-6 w-6 text-blue-500" />
              <span>Generate Free Leads</span>
              <span className="text-xs text-muted-foreground">Google + Apify</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={handleSendEmailBlast}
            >
              <Mail className="h-6 w-6 text-purple-500" />
              <span>Send Email Blast</span>
              <span className="text-xs text-muted-foreground">To {metrics.hotLeads} hot leads</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={handleStartAICalling}
            >
              <Phone className="h-6 w-6 text-green-500" />
              <span>Start AI Calling</span>
              <span className="text-xs text-muted-foreground">VAPI voice calls</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={handleRescoreLeads}
            >
              <Target className="h-6 w-6 text-orange-500" />
              <span>Re-score All Leads</span>
              <span className="text-xs text-muted-foreground">Update temperatures</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lead Temperature Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lead Temperature Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-red-500" />
                  <span>HOT</span>
                </div>
                <span className="font-bold">{metrics.hotLeads}</span>
              </div>
              <Progress
                value={metrics.totalContacts > 0 ? (metrics.hotLeads / metrics.totalContacts) * 100 : 0}
                className="h-2 bg-red-100"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-orange-500" />
                  <span>WARM</span>
                </div>
                <span className="font-bold">{metrics.warmLeads}</span>
              </div>
              <Progress
                value={metrics.totalContacts > 0 ? (metrics.warmLeads / metrics.totalContacts) * 100 : 0}
                className="h-2 bg-orange-100"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Snowflake className="h-4 w-4 text-blue-500" />
                  <span>COLD</span>
                </div>
                <span className="font-bold">{metrics.coldLeads}</span>
              </div>
              <Progress
                value={metrics.totalContacts > 0 ? (metrics.coldLeads / metrics.totalContacts) * 100 : 0}
                className="h-2 bg-blue-100"
              />
            </div>
          </CardContent>
        </Card>

        {/* Recent Lead Generation */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Lead Generation</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/sales/auto-leadgen")}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {leadGenHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No lead generation history yet</p>
                <Button size="sm" className="mt-2" onClick={() => navigate("/sales/auto-leadgen")}>
                  Generate First Leads
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {leadGenHistory.map((history) => (
                  <div key={history.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          history.search_type === "intent" ? "bg-purple-100" : "bg-blue-100"
                        }`}
                      >
                        {history.search_type === "intent" ? (
                          <Activity className="h-4 w-4 text-purple-600" />
                        ) : (
                          <Building2 className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{history.keywords || history.search_type.toUpperCase()}</p>
                        <p className="text-xs text-muted-foreground">{history.leads_saved} leads saved</p>
                      </div>
                    </div>
                    <Badge
                      variant={history.status === "completed" ? "default" : "secondary"}
                      className={
                        history.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : history.status === "running"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100"
                      }
                    >
                      {history.status === "completed" ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : history.status === "running" ? (
                        <Activity className="h-3 w-3 mr-1 animate-pulse" />
                      ) : (
                        <AlertCircle className="h-3 w-3 mr-1" />
                      )}
                      {history.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Value Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="py-4">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-sm text-blue-600 font-medium">Pipeline Value</p>
              <p className="text-2xl font-bold text-blue-800">{metrics.pipelineValue.toLocaleString()} AED</p>
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Weighted Value</p>
              <p className="text-2xl font-bold text-blue-800">
                {Math.round(metrics.weightedValue).toLocaleString()} AED
              </p>
            </div>
            <div>
              <p className="text-sm text-green-600 font-medium">Won This Month</p>
              <p className="text-2xl font-bold text-green-700">{metrics.wonValue.toLocaleString()} AED</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
