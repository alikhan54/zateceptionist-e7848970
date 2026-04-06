import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardCheck,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Award,
  Target,
  Lightbulb,
} from "lucide-react";
import {
  useYTChannels,
  useYTAudits,
  useTriggerAudit,
  type YTChannelAudit,
} from "@/hooks/useYouTubeAgency";

const GRADE_COLORS: Record<string, string> = {
  "A+": "text-green-600 border-green-500 bg-green-500/10",
  A: "text-green-600 border-green-500 bg-green-500/10",
  "B+": "text-blue-600 border-blue-500 bg-blue-500/10",
  B: "text-blue-600 border-blue-500 bg-blue-500/10",
  "C+": "text-yellow-600 border-yellow-500 bg-yellow-500/10",
  C: "text-yellow-600 border-yellow-500 bg-yellow-500/10",
  D: "text-orange-600 border-orange-500 bg-orange-500/10",
  F: "text-red-600 border-red-500 bg-red-500/10",
};

const IMPACT_COLORS: Record<string, string> = {
  high: "bg-red-500/10 text-red-600 border-red-500/30",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  low: "bg-gray-500/10 text-gray-600 border-gray-500/30",
};

function getScoreColor(score: number): string {
  if (score >= 75) return "bg-green-500";
  if (score >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

function ScoreGauge({
  label,
  score,
  icon: Icon,
}: {
  label: string;
  score: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {label}
        </div>
        <span className="text-sm font-semibold">{score}/100</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${getScoreColor(score)} transition-all`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  );
}

export default function ChannelAudit() {
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [selectedAuditId, setSelectedAuditId] = useState<string>("");

  const { data: channels, isLoading: channelsLoading } = useYTChannels();
  const { data: audits, isLoading: auditsLoading } = useYTAudits(
    selectedChannelId || undefined,
  );
  const triggerAudit = useTriggerAudit();

  const selectedAudit: YTChannelAudit | undefined = audits?.find(
    (a) => a.id === selectedAuditId,
  ) ?? audits?.[0];

  const handleRunAudit = () => {
    if (!selectedChannelId) return;
    triggerAudit.mutate({ channel_id: selectedChannelId });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Channel Audit</h1>
        <p className="text-muted-foreground mt-1">
          Generate comprehensive YouTube channel audits
        </p>
      </div>

      {/* Audit Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardCheck className="h-5 w-5" />
            Audit Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium">Select Channel</label>
              <Select
                value={selectedChannelId}
                onValueChange={(v) => {
                  setSelectedChannelId(v);
                  setSelectedAuditId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a channel to audit" />
                </SelectTrigger>
                <SelectContent>
                  {channelsLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading channels...
                    </SelectItem>
                  ) : !channels || channels.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No channels available
                    </SelectItem>
                  ) : (
                    channels.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>
                        {ch.channel_name || ch.handle || ch.channel_id}
                        {ch.subscriber_count
                          ? ` (${new Intl.NumberFormat().format(ch.subscriber_count)} subs)`
                          : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleRunAudit}
                disabled={!selectedChannelId || triggerAudit.isPending}
                className="w-full"
              >
                {triggerAudit.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Analyzing channel...
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    Run Audit
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Results */}
      {selectedAudit && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Audit Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overall Score */}
              <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-muted/30 rounded-lg">
                <div
                  className={`flex flex-col items-center justify-center w-32 h-32 rounded-full border-4 ${
                    GRADE_COLORS[selectedAudit.overall_grade || "C"] ||
                    GRADE_COLORS.C
                  }`}
                >
                  <div className="text-5xl font-bold">
                    {selectedAudit.overall_grade || "-"}
                  </div>
                  <div className="text-sm font-medium mt-1">
                    {selectedAudit.overall_score}/100
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  <ScoreGauge
                    label="Branding"
                    score={selectedAudit.branding_score}
                    icon={Award}
                  />
                  <ScoreGauge
                    label="SEO"
                    score={selectedAudit.seo_score}
                    icon={Target}
                  />
                  <ScoreGauge
                    label="Content"
                    score={selectedAudit.content_score}
                    icon={ClipboardCheck}
                  />
                  <ScoreGauge
                    label="Growth"
                    score={selectedAudit.growth_score}
                    icon={TrendingUp}
                  />
                  <ScoreGauge
                    label="Engagement"
                    score={selectedAudit.engagement_score}
                    icon={Lightbulb}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Executive Summary */}
          {selectedAudit.executive_summary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5" />
                  Executive Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedAudit.executive_summary}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Priority Recommendations */}
          {selectedAudit.priority_recommendations &&
            selectedAudit.priority_recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Lightbulb className="h-5 w-5" />
                    Priority Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-4">
                    {selectedAudit.priority_recommendations.map((rec, idx) => (
                      <li
                        key={idx}
                        className="flex gap-4 p-4 rounded-lg border bg-card"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                          {rec.priority || idx + 1}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{rec.area}</Badge>
                            <Badge
                              variant="outline"
                              className={
                                IMPACT_COLORS[rec.impact?.toLowerCase()] ||
                                IMPACT_COLORS.low
                              }
                            >
                              {rec.impact} impact
                            </Badge>
                          </div>
                          <p className="text-sm leading-relaxed">
                            {rec.recommendation}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}
        </>
      )}

      {/* Audit History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Audit History</CardTitle>
        </CardHeader>
        <CardContent>
          {auditsLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              Loading audits...
            </div>
          ) : !audits || audits.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audits yet</p>
              <p className="text-sm mt-1">
                {selectedChannelId
                  ? "Run an audit for this channel above"
                  : "Select a channel to view audit history"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {audits.map((audit) => (
                <button
                  key={audit.id}
                  onClick={() => setSelectedAuditId(audit.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors hover:bg-muted/50 ${
                    (selectedAuditId || audits[0]?.id) === audit.id
                      ? "border-primary bg-muted/30"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center font-bold ${
                          GRADE_COLORS[audit.overall_grade || "C"] ||
                          GRADE_COLORS.C
                        }`}
                      >
                        {audit.overall_grade || "-"}
                      </div>
                      <div>
                        <div className="font-medium">
                          Overall Score: {audit.overall_score}/100
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(audit.created_at).toLocaleDateString()} at{" "}
                          {new Date(audit.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="hidden md:flex gap-2">
                      <Badge variant="outline">
                        Branding {audit.branding_score}
                      </Badge>
                      <Badge variant="outline">SEO {audit.seo_score}</Badge>
                      <Badge variant="outline">
                        Growth {audit.growth_score}
                      </Badge>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
