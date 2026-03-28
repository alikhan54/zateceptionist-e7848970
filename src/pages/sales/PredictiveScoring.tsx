import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, AlertTriangle, CheckCircle, AlertCircle, Brain, TrendingUp, Users, Target } from "lucide-react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ReferenceLine, Cell, ZAxis,
} from "recharts";
import { format } from "date-fns";

const GRADE_COLORS: Record<string, string> = {
  A: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  B: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  C: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  D: "bg-red-500/15 text-red-400 border-red-500/30",
};

const GRADE_DOT_COLORS: Record<string, string> = {
  A: "#34d399", B: "#60a5fa", C: "#fbbf24", D: "#f87171",
};

export default function PredictiveScoring() {
  const { tenantId } = useTenant();
  const [sortBy, setSortBy] = useState("combined_score");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterHiddenGem, setFilterHiddenGem] = useState(false);
  const [filterFalsePositive, setFilterFalsePositive] = useState(false);

  const { data: predictions = [], isError: predictionsError, isLoading: predictionsLoading } = useQuery({
    queryKey: ["lead_score_predictions", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("lead_score_predictions" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("combined_score", { ascending: false });
      if (error) { console.warn("Predictions query failed:", error.message); return []; }
      return (data as any[]) || [];
    },
    enabled: !!tenantId,
  });

  const { data: model } = useQuery({
    queryKey: ["lead_scoring_models", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from("lead_scoring_models" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .limit(1)
        .single();
      if (error) return null;
      return data as any;
    },
    enabled: !!tenantId,
  });

  // Fetch lead names for the lead_ids in predictions
  const leadIds = useMemo(() => predictions.map((p: any) => p.lead_id).filter(Boolean), [predictions]);

  const { data: leadsMap = {} } = useQuery({
    queryKey: ["sales_leads_for_scoring", tenantId, leadIds],
    queryFn: async () => {
      if (!tenantId || leadIds.length === 0) return {};
      const { data, error } = await supabase
        .from("sales_leads")
        .select("id, contact_name, company_name, name, company")
        .eq("tenant_id", tenantId)
        .in("id", leadIds);
      if (error) return {};
      const map: Record<string, any> = {};
      (data || []).forEach((l: any) => {
        map[l.id] = { name: l.contact_name || l.name || "Unknown", company: l.company_name || l.company || "" };
      });
      return map;
    },
    enabled: !!tenantId && leadIds.length > 0,
  });

  const filtered = useMemo(() => {
    let list = [...predictions];
    if (filterGrade !== "all") list = list.filter((p: any) => p.ml_grade === filterGrade);
    if (filterHiddenGem) list = list.filter((p: any) => p.is_hidden_gem);
    if (filterFalsePositive) list = list.filter((p: any) => p.is_false_positive);
    list.sort((a: any, b: any) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0));
    return list;
  }, [predictions, filterGrade, filterHiddenGem, filterFalsePositive, sortBy]);

  const totalScored = predictions.length;
  const hiddenGemsCount = predictions.filter((p: any) => p.is_hidden_gem).length;
  const falsePositivesCount = predictions.filter((p: any) => p.is_false_positive).length;
  const accuracy = model?.accuracy_percentage ?? 0;

  const hiddenGems = predictions.filter((p: any) => p.is_hidden_gem).slice(0, 5);
  const falsePositives = predictions.filter((p: any) => p.is_false_positive).slice(0, 5);

  const scatterData = predictions.map((p: any) => ({
    x: p.rule_based_score ?? 0,
    y: p.ml_predicted_score ?? 0,
    grade: p.ml_grade || "D",
    name: (leadsMap as any)[p.lead_id]?.name || "Lead",
  }));


  if (predictionsLoading) return <div className="flex items-center justify-center h-96 text-muted-foreground">Loading scoring data...</div>;
  if (predictionsError) return <div className="flex items-center justify-center h-96 text-muted-foreground">Unable to load scoring data. The predictions table may not be available yet.</div>;
  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="text-primary" size={28} /> AI Predictive Scoring
        </h1>
        <p className="text-muted-foreground text-sm mt-1">ML-powered lead scoring with rule vs. model comparison</p>
      </div>

      {/* Model Info */}
      {model && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Scoring Model</CardTitle>
              <Badge className={model.status === "active" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-blue-500/15 text-blue-400 border-blue-500/30"} variant="outline">
                {model.status === "active" ? "Active" : "Training"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Version</span>
                <p className="font-medium">{model.model_version || "v1.0"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Trained</span>
                <p className="font-medium">{model.trained_at ? format(new Date(model.trained_at), "MMM d, yyyy") : "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Accuracy</span>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={accuracy} className="h-2 flex-1" />
                  <span className="font-medium">{accuracy}%</span>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Samples</span>
                <p className="font-medium">{model.training_samples_count?.toLocaleString() ?? "—"} <span className="text-xs text-muted-foreground">({model.positive_samples ?? 0}+ / {model.negative_samples ?? 0}-)</span></p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Run</span>
                <p className="font-medium">{model.last_prediction_run ? format(new Date(model.last_prediction_run), "MMM d, HH:mm") : "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Scored", value: totalScored, icon: Users, color: "text-primary" },
          { label: "Hidden Gems", value: hiddenGemsCount, icon: Sparkles, color: "text-amber-400" },
          { label: "False Positives", value: falsePositivesCount, icon: AlertTriangle, color: "text-red-400" },
          { label: "Model Accuracy", value: `${accuracy}%`, icon: Target, color: "text-emerald-400" },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
                <s.icon className={s.color} size={22} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters & Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-base mr-auto">Lead Predictions</CardTitle>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44 h-8 text-xs bg-muted border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="combined_score">Combined Score</SelectItem>
                <SelectItem value="ml_predicted_score">ML Score</SelectItem>
                <SelectItem value="rule_based_score">Rule Score</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterGrade} onValueChange={setFilterGrade}>
              <SelectTrigger className="w-32 h-8 text-xs bg-muted border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {["A", "B", "C", "D"].map((g) => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <Checkbox checked={filterHiddenGem} onCheckedChange={(v) => setFilterHiddenGem(!!v)} className="h-3.5 w-3.5" /> Hidden Gems
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <Checkbox checked={filterFalsePositive} onCheckedChange={(v) => setFilterFalsePositive(!!v)} className="h-3.5 w-3.5" /> False Positives
            </label>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[420px]">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-xs">Lead</TableHead>
                  <TableHead className="text-xs">Company</TableHead>
                  <TableHead className="text-xs text-center">Rule</TableHead>
                  <TableHead className="text-xs text-center">ML</TableHead>
                  <TableHead className="text-xs text-center">Combined</TableHead>
                  <TableHead className="text-xs text-center">Rule Grade</TableHead>
                  <TableHead className="text-xs text-center">ML Grade</TableHead>
                  <TableHead className="text-xs text-center">Agreement</TableHead>
                  <TableHead className="text-xs">Top Positive</TableHead>
                  <TableHead className="text-xs">Top Negative</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p: any) => {
                  const lead = (leadsMap as any)[p.lead_id];
                  const isGem = p.is_hidden_gem;
                  const isFP = p.is_false_positive;
                  const agrees = p.rule_grade === p.ml_grade;
                  return (
                    <TableRow
                      key={p.id}
                      className={`border-border ${isGem ? "border-l-2 border-l-amber-400" : isFP ? "border-l-2 border-l-red-400" : ""}`}
                    >
                      <TableCell className="text-sm font-medium flex items-center gap-1.5">
                        {isGem && <Sparkles size={13} className="text-amber-400" />}
                        {isFP && <AlertTriangle size={13} className="text-red-400" />}
                        {lead?.name || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{lead?.company || "—"}</TableCell>
                      <TableCell className="text-center text-sm">{p.rule_based_score ?? "—"}</TableCell>
                      <TableCell className="text-center text-sm">{p.ml_predicted_score ?? "—"}</TableCell>
                      <TableCell className="text-center text-sm font-semibold">{p.combined_score ?? "—"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`text-xs ${GRADE_COLORS[p.rule_grade] || ""}`}>{p.rule_grade || "—"}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`text-xs ${GRADE_COLORS[p.ml_grade] || ""}`}>{p.ml_grade || "—"}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {agrees
                          ? <CheckCircle size={16} className="text-emerald-400 mx-auto" />
                          : <AlertCircle size={16} className="text-orange-400 mx-auto" />}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(p.top_positive_features || []).slice(0, 3).map((f: string, i: number) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">{f}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(p.top_negative_features || []).slice(0, 3).map((f: string, i: number) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">{f}</span>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No predictions found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Scatter Chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Rule vs ML Score Agreement</CardTitle>
          <CardDescription className="text-xs">Dots above the diagonal = ML rates higher (potential hidden gems). Below = rules rate higher (potential false positives).</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={360}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" dataKey="x" domain={[0, 100]} name="Rule Score" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} label={{ value: "Rule-Based Score", position: "bottom", offset: 0, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis type="number" dataKey="y" domain={[0, 100]} name="ML Score" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} label={{ value: "ML Score", angle: -90, position: "insideLeft", fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <ZAxis range={[40, 40]} />
              <RechartsTooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(value: any, name: string) => [value, name === "x" ? "Rule Score" : "ML Score"]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""}
              />
              <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" opacity={0.5} />
              <Scatter data={scatterData} shape="circle">
                {scatterData.map((entry, i) => (
                  <Cell key={i} fill={GRADE_DOT_COLORS[entry.grade] || GRADE_DOT_COLORS.D} fillOpacity={0.8} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Insights */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-card border-border border-l-2 border-l-amber-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Sparkles size={16} className="text-amber-400" /> Hidden Gems</CardTitle>
            <CardDescription className="text-xs">Leads ML rates significantly higher than rules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {hiddenGems.length === 0 && <p className="text-sm text-muted-foreground">No hidden gems detected</p>}
            {hiddenGems.map((p: any) => {
              const lead = (leadsMap as any)[p.lead_id];
              return (
                <div key={p.id} className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <p className="font-medium">{lead?.company || lead?.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">ML: {p.ml_predicted_score} vs Rule: {p.rule_based_score}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(p.top_positive_features || []).slice(0, 3).map((f: string, i: number) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">{f}</span>
                      ))}
                    </div>
                  </div>
                  <Sparkles size={14} className="text-amber-400 mt-1 shrink-0" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-l-2 border-l-red-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle size={16} className="text-red-400" /> False Positives</CardTitle>
            <CardDescription className="text-xs">Leads ML rates significantly lower than rules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {falsePositives.length === 0 && <p className="text-sm text-muted-foreground">No false positives detected</p>}
            {falsePositives.map((p: any) => {
              const lead = (leadsMap as any)[p.lead_id];
              return (
                <div key={p.id} className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <p className="font-medium">{lead?.company || lead?.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">ML: {p.ml_predicted_score} vs Rule: {p.rule_based_score}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(p.top_negative_features || []).slice(0, 3).map((f: string, i: number) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">{f}</span>
                      ))}
                    </div>
                  </div>
                  <AlertTriangle size={14} className="text-red-400 mt-1 shrink-0" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
