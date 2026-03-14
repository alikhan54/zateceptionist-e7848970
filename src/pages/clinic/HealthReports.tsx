import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useHealthReports, HealthReport, HealthAnalysis } from "@/hooks/useHealthReports";
import { useClinicPatients } from "@/hooks/useClinicPatients";
import { FileText, Upload, Activity, Brain, TrendingUp, AlertTriangle } from "lucide-react";

const REPORT_TYPES = [
  { value: "skin_analysis", label: "Skin Analysis" },
  { value: "body_analyzer", label: "Body Analyzer" },
  { value: "oligoscan", label: "Oligoscan" },
  { value: "blood_test", label: "Blood Test" },
  { value: "vitamin_panel", label: "Vitamin Panel" },
  { value: "hormone_profile", label: "Hormone Profile" },
  { value: "general", label: "General Report" },
];

const statusColors: Record<string, string> = {
  uploaded: "bg-blue-100 text-blue-800",
  analyzing: "bg-yellow-100 text-yellow-800",
  analyzed: "bg-green-100 text-green-800",
  review_pending: "bg-orange-100 text-orange-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};

function ScoreBar({ label, score, max = 100 }: { label: string; score: number; max?: number }) {
  const pct = Math.min(100, (score / max) * 100);
  const color = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span className="font-medium">{score}/{max}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function HealthReports() {
  const { reports, analyses, stats, isLoading, uploadReport, isUploading } = useHealthReports();
  const { patients } = useClinicPatients();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedReportType, setSelectedReportType] = useState("");
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!selectedPatientId || !selectedReportType) return;
    await uploadReport({
      patient_id: selectedPatientId,
      report_type: selectedReportType,
    });
    setUploadOpen(false);
    setSelectedPatientId("");
    setSelectedReportType("");
  };

  const getPatientName = (patientId: string) => {
    const p = patients.find(p => p.id === patientId);
    return p?.full_name || "Unknown Patient";
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Health Reports</h1>
          <p className="text-muted-foreground">Medical report analysis & health intelligence</p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button><Upload className="h-4 w-4 mr-2" />Upload Report</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Medical Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Patient</Label>
                <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                  <SelectTrigger><SelectValue placeholder="Select patient..." /></SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name} — {p.phone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                  <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
              <Button onClick={handleUpload} disabled={isUploading || !selectedPatientId || !selectedReportType}>
                {isUploading ? "Uploading..." : "Upload & Analyze"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReports}</div>
            <p className="text-xs text-muted-foreground">{stats.reportsThisMonth} this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analyzed</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.analyzedReports}</div>
            <p className="text-xs text-muted-foreground">{stats.pendingReports} pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Health Score</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgHealthScore ?? "—"}</div>
            <p className="text-xs text-muted-foreground">Out of 100</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analyses</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyses.length}</div>
            <p className="text-xs text-muted-foreground">Cross-report correlations</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">Medical Reports</TabsTrigger>
          <TabsTrigger value="analyses">Health Analyses</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          {isLoading ? (
            <p className="text-muted-foreground text-sm p-4">Loading reports...</p>
          ) : reports.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No medical reports yet. Upload a report to start AI analysis.</p>
              </CardContent>
            </Card>
          ) : (
            reports.map((report) => (
              <Card key={report.id} className="cursor-pointer" onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{getPatientName(report.patient_id)}</p>
                        <p className="text-sm text-muted-foreground">
                          {REPORT_TYPES.find(t => t.value === report.report_type)?.label || report.report_type}
                          {" · "}{new Date(report.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {report.overall_health_score !== null && (
                        <span className={`text-lg font-bold ${report.overall_health_score >= 70 ? 'text-green-600' : report.overall_health_score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {report.overall_health_score}
                        </span>
                      )}
                      <Badge className={statusColors[report.status] || ""}>{report.status}</Badge>
                    </div>
                  </div>

                  {expandedReport === report.id && (
                    <div className="mt-4 border-t pt-4 space-y-3">
                      {report.ai_summary && (
                        <div>
                          <p className="text-sm font-medium mb-1">AI Summary</p>
                          <p className="text-sm text-muted-foreground">{report.ai_summary}</p>
                        </div>
                      )}
                      {report.severity_scores && Object.keys(report.severity_scores).length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Severity Scores</p>
                          <div className="grid gap-2 md:grid-cols-2">
                            {Object.entries(report.severity_scores).map(([key, val]) => (
                              <ScoreBar key={key} label={key.replace(/_/g, " ")} score={Number(val)} />
                            ))}
                          </div>
                        </div>
                      )}
                      {report.extracted_data && Object.keys(report.extracted_data).length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-1">Extracted Data</p>
                          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48">
                            {JSON.stringify(report.extracted_data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="analyses" className="space-y-4">
          {isLoading ? (
            <p className="text-muted-foreground text-sm p-4">Loading analyses...</p>
          ) : analyses.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No health analyses yet. Upload multiple reports for cross-report correlation.</p>
              </CardContent>
            </Card>
          ) : (
            analyses.map((analysis) => (
              <Card key={analysis.id} className="cursor-pointer" onClick={() => setExpandedAnalysis(expandedAnalysis === analysis.id ? null : analysis.id)}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Brain className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{getPatientName(analysis.patient_id)}</p>
                        <p className="text-sm text-muted-foreground">
                          {(analysis.report_ids || []).length} reports correlated · {new Date(analysis.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl font-bold ${(analysis.health_score || 0) >= 70 ? 'text-green-600' : (analysis.health_score || 0) >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {analysis.health_score ?? "—"}
                      </span>
                      <Badge variant={analysis.status === "approved" ? "default" : "outline"}>{analysis.status}</Badge>
                    </div>
                  </div>

                  {expandedAnalysis === analysis.id && (
                    <div className="mt-4 border-t pt-4 space-y-4">
                      {analysis.category_scores && Object.keys(analysis.category_scores).length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Category Scores</p>
                          <div className="grid gap-2 md:grid-cols-2">
                            {Object.entries(analysis.category_scores).map(([key, val]) => (
                              <ScoreBar key={key} label={key.replace(/_/g, " ")} score={Number(val)} />
                            ))}
                          </div>
                        </div>
                      )}
                      {Array.isArray(analysis.key_findings) && analysis.key_findings.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-orange-500" /> Key Findings
                          </p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {analysis.key_findings.map((f: any, i: number) => (
                              <li key={i}>{typeof f === "string" ? f : JSON.stringify(f)}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-1">Recommendations</p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {analysis.recommendations.map((r: any, i: number) => (
                              <li key={i}>{typeof r === "string" ? r : JSON.stringify(r)}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {Array.isArray(analysis.correlations) && analysis.correlations.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-1">Cross-Report Correlations</p>
                          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-36">
                            {JSON.stringify(analysis.correlations, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
