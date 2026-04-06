import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileBarChart,
  Loader2,
  Download,
  Send,
  Calendar,
  TrendingUp,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useYTChannels,
  useYTReports,
  useTriggerReport,
  type YTClientReport,
} from "@/hooks/useYouTubeAgency";

const REPORT_TYPES = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

const STATUS_STYLES: Record<string, string> = {
  generated: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  reviewed: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  sent: "bg-green-500/10 text-green-600 border-green-500/30",
  draft: "bg-slate-500/10 text-slate-600 border-slate-500/30",
};

const numberFormatter = new Intl.NumberFormat("en");

const formatNumber = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return "—";
  return numberFormatter.format(val);
};

const formatDate = (val: string): string => {
  try {
    return new Date(val).toLocaleDateString();
  } catch {
    return val;
  }
};

const defaultStart = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};

const defaultEnd = (): string => new Date().toISOString().slice(0, 10);

export default function Reports() {
  const { toast } = useToast();
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [reportType, setReportType] = useState<string>("monthly");
  const [periodStart, setPeriodStart] = useState<string>(defaultStart());
  const [periodEnd, setPeriodEnd] = useState<string>(defaultEnd());
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const { data: channels } = useYTChannels();
  const {
    data: reports,
    isLoading: reportsLoading,
  } = useYTReports(selectedChannelId || undefined);
  const triggerReport = useTriggerReport();

  const selectedReport = useMemo<YTClientReport | null>(() => {
    if (!reports || !selectedReportId) return null;
    return reports.find((r) => r.id === selectedReportId) || null;
  }, [reports, selectedReportId]);

  const handleGenerate = () => {
    if (!selectedChannelId) {
      toast({
        title: "Channel required",
        description: "Choose a channel to generate the report for.",
        variant: "destructive",
      });
      return;
    }
    if (!periodStart || !periodEnd) {
      toast({
        title: "Date range required",
        description: "Please provide both start and end dates.",
        variant: "destructive",
      });
      return;
    }
    triggerReport.mutate({
      channel_id: selectedChannelId,
      report_type: reportType,
      period_start: periodStart,
      period_end: periodEnd,
    });
  };

  const handleDownload = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleSendToClient = () => {
    toast({
      title: "Coming soon",
      description: "Client email delivery is on the way.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Client Reports</h1>
        <p className="text-muted-foreground mt-1">
          Generate professional white-label reports for your clients
        </p>
      </div>

      {/* Generate New Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileBarChart className="h-5 w-5" />
            Generate New Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="report-channel">Channel</Label>
              <Select
                value={selectedChannelId}
                onValueChange={setSelectedChannelId}
              >
                <SelectTrigger id="report-channel">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {(channels || []).map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>
                      {ch.channel_name || ch.handle || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="report-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="period-start">Period Start</Label>
              <Input
                id="period-start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="period-end">Period End</Label>
              <Input
                id="period-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={triggerReport.isPending || !selectedChannelId}
            className="w-full md:w-auto"
          >
            {triggerReport.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <FileBarChart className="h-4 w-4 mr-2" />
            )}
            Generate Report
          </Button>
        </CardContent>
      </Card>

      {/* Report Preview */}
      {selectedReport && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-lg">Report Preview</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDate(selectedReport.period_start)} —{" "}
                  {formatDate(selectedReport.period_end)} •{" "}
                  {selectedReport.report_type}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download PDF
                </Button>
                <Button size="sm" onClick={handleSendToClient}>
                  <Send className="h-4 w-4 mr-1" />
                  Send to Client
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* KPI summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  Subscribers Δ
                </p>
                <p className="text-xl font-bold">
                  {selectedReport.subscriber_change !== null &&
                  selectedReport.subscriber_change >= 0
                    ? "+"
                    : ""}
                  {formatNumber(selectedReport.subscriber_change)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">View Change</p>
                <p className="text-xl font-bold">
                  {selectedReport.view_change !== null &&
                  selectedReport.view_change >= 0
                    ? "+"
                    : ""}
                  {formatNumber(selectedReport.view_change)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  Thumbnails Delivered
                </p>
                <p className="text-xl font-bold">
                  {selectedReport.thumbnails_delivered}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Scripts Delivered</p>
                <p className="text-xl font-bold">
                  {selectedReport.scripts_delivered}
                </p>
              </div>
            </div>

            {selectedReport.executive_summary && (
              <div className="rounded-lg border p-4 bg-muted/30">
                <p className="text-sm font-semibold mb-2">Executive Summary</p>
                <p className="text-sm whitespace-pre-wrap">
                  {selectedReport.executive_summary}
                </p>
              </div>
            )}

            {selectedReport.report_html ? (
              <div className="rounded-lg border overflow-hidden bg-white">
                <div
                  className="p-6 prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedReport.report_html }}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
                Full HTML report will appear here once it has been generated.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Report History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report History</CardTitle>
        </CardHeader>
        <CardContent>
          {reportsLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              Loading reports...
            </div>
          ) : !reports || reports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileBarChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No reports yet</p>
              <p className="text-sm mt-1">
                Generate your first report using the form above
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">
                      Period
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Subscribers Gained
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Views
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Generated
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-b last:border-0 cursor-pointer hover:bg-muted/40 ${
                        selectedReportId === r.id ? "bg-muted/40" : ""
                      }`}
                      onClick={() => setSelectedReportId(r.id)}
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {formatDate(r.period_start)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              to {formatDate(r.period_end)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge variant="secondary" className="capitalize">
                          {r.report_type}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">
                            {r.subscriber_change !== null &&
                            r.subscriber_change >= 0
                              ? "+"
                              : ""}
                            {formatNumber(r.subscriber_change)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span>{formatNumber(r.view_change)}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className={
                            STATUS_STYLES[r.status] || STATUS_STYLES.draft
                          }
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {formatDate(r.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
