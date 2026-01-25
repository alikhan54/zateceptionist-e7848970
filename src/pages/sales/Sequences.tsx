// src/pages/sales/Sequences.tsx
// COMPLETE - Connected to real database
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  Pause,
  Plus,
  Settings,
  MoreHorizontal,
  Mail,
  Phone,
  MessageSquare,
  Linkedin,
  Instagram,
  Facebook,
  Clock,
  Users,
  TrendingUp,
  Target,
  Zap,
  Edit,
  Copy,
  Trash2,
  RefreshCw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FeatureGate, TierBadge, UsageMeter } from "@/components/subscription";

interface SequenceStep {
  type: "email" | "whatsapp" | "call" | "linkedin" | "instagram" | "facebook";
  delay_days: number;
  delay_hours: number;
  template: string;
  subject?: string;
}

interface Sequence {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: "active" | "paused" | "draft";
  steps: SequenceStep[];
  enrolled_count: number;
  completed_count: number;
  open_rate: number;
  reply_rate: number;
  created_at: string;
}

const channelIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-3 w-3" />,
  whatsapp: <MessageSquare className="h-3 w-3" />,
  call: <Phone className="h-3 w-3" />,
  linkedin: <Linkedin className="h-3 w-3" />,
  instagram: <Instagram className="h-3 w-3" />,
  facebook: <Facebook className="h-3 w-3" />,
};

const channelColors: Record<string, string> = {
  email: "bg-blue-500",
  whatsapp: "bg-green-500",
  call: "bg-amber-500",
  linkedin: "bg-blue-700",
  instagram: "bg-pink-500",
  facebook: "bg-blue-600",
};

export default function Sequences() {
  const navigate = useNavigate();
  // CRITICAL FIX: Get both tenantId (slug) and tenantConfig (full object with UUID)
  const { tenantId, tenantConfig } = useTenant();
  // USE THIS FOR ALL DATABASE OPERATIONS - This is the actual UUID!
  const tenantUuid = tenantConfig?.id;
  
  const { limits, usage } = useSubscription();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("library");

  useEffect(() => {
    if (tenantUuid) {
      fetchSequences();
    }
  }, [tenantUuid]);

  const fetchSequences = async () => {
    if (!tenantUuid) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("sequences")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Parse steps JSON if needed
      const parsed = (data || []).map((seq) => ({
        ...seq,
        steps: typeof seq.steps === "string" ? JSON.parse(seq.steps) : seq.steps || [],
      }));

      setSequences(parsed);
    } catch (error) {
      console.error("Error fetching sequences:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSequenceStatus = async (sequence: Sequence) => {
    const newStatus = sequence.status === "active" ? "paused" : "active";

    try {
      const { error } = await supabase
        .from("sequences")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", sequence.id);

      if (error) throw error;

      setSequences((prev) => prev.map((s) => (s.id === sequence.id ? { ...s, status: newStatus } : s)));
    } catch (error) {
      console.error("Error updating sequence:", error);
    }
  };

  const duplicateSequence = async (sequence: Sequence) => {
    if (!tenantUuid) return;
    try {
      const { error } = await supabase.from("sequences").insert({
        tenant_id: tenantUuid,
        name: `${sequence.name} (Copy)`,
        description: sequence.description,
        status: "draft",
        steps: sequence.steps,
        enrolled_count: 0,
        completed_count: 0,
        open_rate: 0,
        reply_rate: 0,
      });

      if (error) throw error;
      fetchSequences();
    } catch (error) {
      console.error("Error duplicating sequence:", error);
    }
  };

  const deleteSequence = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sequence?")) return;

    try {
      const { error } = await supabase.from("sequences").delete().eq("id", id);

      if (error) throw error;
      setSequences((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error("Error deleting sequence:", error);
    }
  };

  const activeSequences = sequences.filter((s) => s.status === "active");
  const totalEnrolled = sequences.reduce((sum, s) => sum + (s.enrolled_count || 0), 0);
  const avgOpenRate =
    sequences.length > 0 ? sequences.reduce((sum, s) => sum + (s.open_rate || 0), 0) / sequences.length : 0;
  const avgReplyRate =
    sequences.length > 0 ? sequences.reduce((sum, s) => sum + (s.reply_rate || 0), 0) / sequences.length : 0;

  const SequenceCard = ({ sequence }: { sequence: Sequence }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <div>
              <h3 className="font-semibold text-sm">{sequence.name}</h3>
              <p className="text-xs text-muted-foreground">{sequence.steps.length} steps</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={sequence.status === "active" ? "default" : "secondary"}
              className={sequence.status === "active" ? "bg-green-500" : ""}
            >
              {sequence.status}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/sales/sequences/${sequence.id}`)}>
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => duplicateSequence(sequence)}>
                  <Copy className="h-4 w-4 mr-2" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600" onClick={() => deleteSequence(sequence.id)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Steps visualization */}
        <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
          {sequence.steps.map((step, idx) => (
            <React.Fragment key={idx}>
              <div
                className={`flex items-center justify-center h-6 w-6 rounded-full text-white ${channelColors[step.type] || "bg-gray-500"}`}
                title={`${step.type} - Day ${step.delay_days}`}
              >
                {channelIcons[step.type]}
              </div>
              {idx < sequence.steps.length - 1 && (
                <div className="flex items-center">
                  <div className="w-4 h-0.5 bg-muted-foreground/30" />
                  <Clock className="h-3 w-3 text-muted-foreground/50" />
                  <div className="w-4 h-0.5 bg-muted-foreground/30" />
                </div>
              )}
            </React.Fragment>
          ))}
          {sequence.steps.length > 6 && (
            <span className="text-xs text-muted-foreground ml-1">+{sequence.steps.length - 6}</span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 text-center mb-4">
          <div>
            <p className="text-lg font-bold">{sequence.enrolled_count}</p>
            <p className="text-xs text-muted-foreground">Enrolled</p>
          </div>
          <div>
            <p className="text-lg font-bold">{sequence.completed_count}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div>
            <p className="text-lg font-bold text-blue-600">{sequence.open_rate}%</p>
            <p className="text-xs text-muted-foreground">Open Rate</p>
          </div>
          <div>
            <p className="text-lg font-bold text-green-600">{sequence.reply_rate}%</p>
            <p className="text-xs text-muted-foreground">Reply Rate</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant={sequence.status === "active" ? "outline" : "default"}
            size="sm"
            className="flex-1"
            onClick={() => toggleSequenceStatus(sequence)}
          >
            {sequence.status === "active" ? (
              <>
                <Pause className="h-4 w-4 mr-1" /> Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" /> Activate
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/sales/sequences/${sequence.id}`)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6" /> Sales Sequences
          </h1>
          <p className="text-muted-foreground">Automated multi-channel outreach workflows</p>
        </div>
        <div className="flex items-center gap-3">
          <TierBadge />
          <Button onClick={fetchSequences} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button onClick={() => navigate("/sales/sequences/new")}>
            <Plus className="h-4 w-4 mr-1" /> Create Sequence
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Sequences</p>
                <p className="text-2xl font-bold">{activeSequences.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Play className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Limit: {limits.active_sequences === -1 ? "Unlimited" : limits.active_sequences}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Enrolled</p>
                <p className="text-2xl font-bold">{totalEnrolled}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Open Rate</p>
                <p className="text-2xl font-bold">{avgOpenRate.toFixed(1)}%</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Reply Rate</p>
                <p className="text-2xl font-bold">{avgReplyRate.toFixed(1)}%</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="library">Sequence Library</TabsTrigger>
          <TabsTrigger value="active">Active Sequences</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 h-48 bg-muted" />
                </Card>
              ))}
            </div>
          ) : sequences.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No sequences yet</h3>
                <p className="text-muted-foreground mb-4">Create your first automated outreach sequence</p>
                <Button onClick={() => navigate("/sales/sequences/new")}>
                  <Plus className="h-4 w-4 mr-1" /> Create Sequence
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {sequences.map((sequence) => (
                <SequenceCard key={sequence.id} sequence={sequence} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          {activeSequences.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No active sequences</h3>
                <p className="text-muted-foreground">Activate a sequence to start automated outreach</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {activeSequences.map((sequence) => (
                <SequenceCard key={sequence.id} sequence={sequence} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <FeatureGate feature="has_ai_scoring">
            <Card>
              <CardHeader>
                <CardTitle>Sequence Performance Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sequences.map((seq) => (
                    <div key={seq.id} className="flex items-center gap-4">
                      <div className="w-48 truncate font-medium">{seq.name}</div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Open Rate</span>
                          <span>{seq.open_rate}%</span>
                        </div>
                        <Progress value={seq.open_rate} className="h-2" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Reply Rate</span>
                          <span>{seq.reply_rate}%</span>
                        </div>
                        <Progress value={seq.reply_rate} className="h-2 [&>div]:bg-green-500" />
                      </div>
                      <div className="text-right w-24">
                        <p className="text-sm font-bold">{seq.enrolled_count}</p>
                        <p className="text-xs text-muted-foreground">enrolled</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </FeatureGate>
        </TabsContent>
      </Tabs>
    </div>
  );
}
