import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Users, Target, TrendingUp, Award, ChevronDown, ChevronUp, Globe } from "lucide-react";
import { RTLWrapper } from "@/components/realestate/RTLWrapper";
import { useRELeadScores, LeadScore } from "@/hooks/useRELeadScores";

const formatAED = (n: number) => `AED ${n.toLocaleString()}`;

const gradeColors: Record<string, string> = {
  A: "bg-green-100 text-green-800 border-green-300",
  B: "bg-blue-100 text-blue-800 border-blue-300",
  C: "bg-yellow-100 text-yellow-800 border-yellow-300",
  D: "bg-gray-100 text-gray-600 border-gray-300",
};

const urgencyColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-blue-100 text-blue-800",
  cold: "bg-gray-100 text-gray-600",
};

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-20">{label}</span>
      <Progress value={score} className="flex-1 h-2" />
      <span className="text-xs font-medium w-8 text-right">{score}</span>
    </div>
  );
}

export default function LeadScoring() {
  const { scores, isLoading, stats } = useRELeadScores();
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = scores.filter((s) => {
    if (gradeFilter !== "all" && s.score_grade !== gradeFilter) return false;
    if (urgencyFilter !== "all" && s.urgency_level !== urgencyFilter) return false;
    return true;
  });

  return (
    <RTLWrapper>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Scoring</h1>
          <p className="text-muted-foreground">AI-powered buyer scoring with visa eligibility and cross-border intelligence</p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Scored</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Grade A (Hot)</CardTitle>
              <Target className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{isLoading ? "..." : stats.gradeA}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : `${stats.avgScore}%`}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Visa Eligible</CardTitle>
              <Globe className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{isLoading ? "..." : stats.visaEligible}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Grade Distribution</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-1 text-xs">
                <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-800">A:{stats.gradeA}</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">B:{stats.gradeB}</span>
                <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">C:{stats.gradeC}</span>
                <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">D:{stats.gradeD}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Grades" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              <SelectItem value="A">Grade A</SelectItem>
              <SelectItem value="B">Grade B</SelectItem>
              <SelectItem value="C">Grade C</SelectItem>
              <SelectItem value="D">Grade D</SelectItem>
            </SelectContent>
          </Select>
          <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Urgency" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Urgency</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="cold">Cold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Scores Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Client</th>
                    <th className="text-left p-3 font-medium">Nationality</th>
                    <th className="text-right p-3 font-medium">Budget</th>
                    <th className="text-center p-3 font-medium">Score</th>
                    <th className="text-center p-3 font-medium">Grade</th>
                    <th className="text-center p-3 font-medium">Urgency</th>
                    <th className="text-center p-3 font-medium">Visa</th>
                    <th className="text-left p-3 font-medium">Recommended Action</th>
                    <th className="p-3 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Loading scores...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No scored clients yet. Scores update every 15 minutes.</td></tr>
                  ) : (
                    filtered.map((s) => {
                      const isExpanded = expandedId === s.id;
                      const breakdown = s.score_breakdown || {};
                      const visaPrograms = (breakdown.visa?.programs || []) as string[];
                      return (
                        <>
                          <tr key={s.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : s.id)}>
                            <td className="p-3 font-medium">{s.client_name}</td>
                            <td className="p-3">{s.client_nationality || "-"}</td>
                            <td className="p-3 text-right">{s.client_budget_max ? formatAED(s.client_budget_max) : "-"}</td>
                            <td className="p-3 text-center">
                              <span className="font-bold">{s.purchase_probability}%</span>
                              {s.score_change !== 0 && (
                                <span className={`text-xs ml-1 ${s.score_change > 0 ? "text-green-600" : "text-red-600"}`}>
                                  {s.score_change > 0 ? "+" : ""}{s.score_change}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <Badge className={gradeColors[s.score_grade] || ""}>{s.score_grade}</Badge>
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant="outline" className={urgencyColors[s.urgency_level] || ""}>{s.urgency_level}</Badge>
                            </td>
                            <td className="p-3 text-center">
                              {visaPrograms.length > 0 ? (
                                visaPrograms.map((v, i) => (
                                  <Badge key={i} variant="outline" className="bg-purple-50 text-purple-700 text-xs">
                                    {v.includes("Golden") ? "\uD83C\uDFC6" : "\uD83C\uDFE0"} {v}
                                  </Badge>
                                ))
                              ) : "-"}
                            </td>
                            <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">{s.recommended_action}</td>
                            <td className="p-3">{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</td>
                          </tr>
                          {isExpanded && (
                            <tr key={s.id + "-detail"}>
                              <td colSpan={9} className="p-4 bg-muted/20">
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <h4 className="font-medium text-sm">Score Breakdown</h4>
                                    <ScoreBar label="Behavioral" score={s.behavioral_score} color="blue" />
                                    <ScoreBar label="Financial" score={s.financial_fit_score} color="green" />
                                    <ScoreBar label="Visa" score={s.visa_eligibility_score} color="purple" />
                                    <ScoreBar label="Engagement" score={s.engagement_score} color="orange" />
                                    <ScoreBar label="Urgency" score={s.urgency_score} color="red" />
                                  </div>
                                  <div className="space-y-2">
                                    <h4 className="font-medium text-sm">AI Summary</h4>
                                    <p className="text-sm text-muted-foreground">{s.ai_summary || "No AI analysis available"}</p>
                                    <h4 className="font-medium text-sm mt-3">Recommended Action</h4>
                                    <p className="text-sm">{s.recommended_action}</p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Scored: {new Date(s.scored_at).toLocaleString()} | Model: {s.ai_model}
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </RTLWrapper>
  );
}
