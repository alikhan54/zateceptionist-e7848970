import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Flame,
  TrendingUp,
  TrendingDown,
  Activity,
  Loader2,
  RefreshCw,
  FileText,
  Sparkles,
} from "lucide-react";
import {
  useYTTrends,
  useTriggerTrendRefresh,
  type YTTrendingTopic,
} from "@/hooks/useYouTubeAgency";

const NICHE_OPTIONS = [
  "gaming",
  "fitness",
  "cooking",
  "beauty",
  "tech",
  "education",
  "entertainment",
  "music",
  "vlogs",
  "other",
];

const VELOCITY_OPTIONS = [
  { value: "all", label: "All Velocities" },
  { value: "exploding", label: "Exploding" },
  { value: "rising", label: "Rising" },
  { value: "steady", label: "Steady" },
  { value: "declining", label: "Declining" },
];

const URGENCY_OPTIONS = [
  { value: "all", label: "All Urgency" },
  { value: "act_now", label: "Act Now" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
];

const URGENCY_COLORS: Record<string, string> = {
  act_now: "bg-red-500/10 text-red-600 border-red-500/30",
  this_week: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  this_month: "bg-blue-500/10 text-blue-600 border-blue-500/30",
};

function getTrendScoreStyle(score: number): string {
  if (score >= 90) return "bg-red-500/10 text-red-600 border-red-500/40";
  if (score >= 70) return "bg-orange-500/10 text-orange-600 border-orange-500/40";
  if (score >= 50) return "bg-yellow-500/10 text-yellow-600 border-yellow-500/40";
  return "bg-gray-500/10 text-gray-600 border-gray-500/40";
}

function VelocityIcon({ velocity }: { velocity: string | null }) {
  const cls = "h-4 w-4";
  switch (velocity?.toLowerCase()) {
    case "exploding":
      return <Flame className={`${cls} text-red-500`} />;
    case "rising":
      return <TrendingUp className={`${cls} text-green-500`} />;
    case "declining":
      return <TrendingDown className={`${cls} text-red-400`} />;
    case "steady":
    default:
      return <Activity className={`${cls} text-blue-500`} />;
  }
}

function formatUrgency(urgency: string | null): string {
  if (!urgency) return "";
  return urgency
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function Trends() {
  const navigate = useNavigate();
  const [nicheFilter, setNicheFilter] = useState<string>("all");
  const [velocityFilter, setVelocityFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");

  const { data: trends, isLoading } = useYTTrends(
    nicheFilter !== "all" ? nicheFilter : undefined,
  );
  const refreshTrends = useTriggerTrendRefresh();

  const filteredTrends: YTTrendingTopic[] = (trends || []).filter((t) => {
    if (velocityFilter !== "all" && t.velocity !== velocityFilter) return false;
    if (urgencyFilter !== "all" && t.urgency !== urgencyFilter) return false;
    return true;
  });

  const handleGenerateScript = (topic: string) => {
    navigate(`/youtube/scripts?topic=${encodeURIComponent(topic)}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">YouTube Trends</h1>
          <p className="text-muted-foreground mt-1">
            Real-time trending topics for your client niches
          </p>
        </div>
        <Button
          onClick={() => refreshTrends.mutate()}
          disabled={refreshTrends.isPending}
        >
          {refreshTrends.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Trends
            </>
          )}
        </Button>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Niche</label>
              <Select value={nicheFilter} onValueChange={setNicheFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All niches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Niches</SelectItem>
                  {NICHE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n.charAt(0).toUpperCase() + n.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Velocity</label>
              <Select value={velocityFilter} onValueChange={setVelocityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VELOCITY_OPTIONS.map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Urgency</label>
              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {URGENCY_OPTIONS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trends Grid */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            Loading trends...
          </CardContent>
        </Card>
      ) : filteredTrends.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No trending topics found</p>
            <p className="text-sm mt-1">
              Try adjusting filters or refresh to fetch new trends
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrends.map((trend) => (
            <Card key={trend.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-2">
                    {trend.topic}
                  </CardTitle>
                  <div
                    className={`flex-shrink-0 px-3 py-2 rounded-lg border font-bold text-lg ${getTrendScoreStyle(trend.trend_score)}`}
                  >
                    {trend.trend_score}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {trend.velocity && (
                    <Badge variant="outline" className="gap-1">
                      <VelocityIcon velocity={trend.velocity} />
                      {formatUrgency(trend.velocity)}
                    </Badge>
                  )}
                  {trend.niche && (
                    <Badge variant="secondary">{trend.niche}</Badge>
                  )}
                  {trend.urgency && (
                    <Badge
                      variant="outline"
                      className={
                        URGENCY_COLORS[trend.urgency] ||
                        "bg-gray-500/10 text-gray-600 border-gray-500/30"
                      }
                    >
                      {formatUrgency(trend.urgency)}
                    </Badge>
                  )}
                </div>

                {typeof trend.search_volume_change_pct === "number" && (
                  <div className="text-sm text-muted-foreground">
                    Search volume:{" "}
                    <span
                      className={
                        trend.search_volume_change_pct >= 0
                          ? "text-green-600 font-medium"
                          : "text-red-600 font-medium"
                      }
                    >
                      {trend.search_volume_change_pct >= 0 ? "+" : ""}
                      {trend.search_volume_change_pct}%
                    </span>
                  </div>
                )}

                {trend.avg_views_on_topic && (
                  <div className="text-sm text-muted-foreground">
                    Avg views:{" "}
                    <span className="font-medium text-foreground">
                      {new Intl.NumberFormat().format(trend.avg_views_on_topic)}
                    </span>
                  </div>
                )}

                {trend.suggested_title && (
                  <div className="p-3 rounded-lg bg-muted/40 text-sm">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Suggested Title
                    </div>
                    <div className="line-clamp-2">{trend.suggested_title}</div>
                  </div>
                )}

                <div className="mt-auto pt-2">
                  <Button
                    onClick={() => handleGenerateScript(trend.topic)}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Script
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
