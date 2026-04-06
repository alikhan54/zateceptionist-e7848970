import { useState, useMemo } from "react";
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
  Swords,
  AlertTriangle,
  Eye,
  Trash2,
  Loader2,
  Bell,
  FileText,
  Sparkles,
  TrendingUp,
  Flame,
  Target,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useYTChannels,
  useYTCompetitors,
  useYTAlerts,
  useMarkAlertRead,
  useRemoveCompetitor,
  type YTCompetitorAlert,
} from "@/hooks/useYouTubeAgency";

const numberFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const plainFormatter = new Intl.NumberFormat("en");

const formatNumber = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return "—";
  return numberFormatter.format(val);
};

const formatFullNumber = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return "—";
  return plainFormatter.format(val);
};

const ALERT_TYPE_STYLES: Record<
  string,
  { border: string; badge: string; icon: typeof Bell }
> = {
  new_video: {
    border: "border-l-blue-500",
    badge: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    icon: TrendingUp,
  },
  viral_video: {
    border: "border-l-red-500",
    badge: "bg-red-500/10 text-red-600 border-red-500/30",
    icon: Flame,
  },
  sub_milestone: {
    border: "border-l-green-500",
    badge: "bg-green-500/10 text-green-600 border-green-500/30",
    icon: Target,
  },
  content_gap: {
    border: "border-l-purple-500",
    badge: "bg-purple-500/10 text-purple-600 border-purple-500/30",
    icon: Sparkles,
  },
};

const getAlertStyle = (type: string) =>
  ALERT_TYPE_STYLES[type] || {
    border: "border-l-slate-500",
    badge: "bg-slate-500/10 text-slate-600 border-slate-500/30",
    icon: Bell,
  };

export default function Competitors() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedClientChannel, setSelectedClientChannel] = useState<string>("");
  const [alertTab, setAlertTab] = useState<"all" | "unread">("all");

  const { data: channels } = useYTChannels("active_client");
  const {
    data: competitors,
    isLoading: competitorsLoading,
  } = useYTCompetitors(selectedClientChannel || undefined);
  const {
    data: alerts,
    isLoading: alertsLoading,
  } = useYTAlerts(alertTab === "unread");
  const markRead = useMarkAlertRead();
  const removeCompetitor = useRemoveCompetitor();

  const unreadCount = useMemo(() => {
    if (!alerts) return 0;
    return alerts.filter((a) => !a.is_read).length;
  }, [alerts]);

  const contentGaps = useMemo(() => {
    if (!competitors) return [] as Array<{ topic: string; count: number }>;
    const map = new Map<string, number>();
    competitors.forEach((c) => {
      (c.content_gaps || []).forEach((gap) => {
        if (!gap) return;
        map.set(gap, (map.get(gap) || 0) + 1);
      });
    });
    return Array.from(map.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);
  }, [competitors]);

  const handleDiscoverCompetitors = () => {
    if (!selectedClientChannel) {
      toast({
        title: "Select a channel",
        description: "Choose a client channel first to discover competitors.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Coming soon",
      description:
        "Automatic competitor discovery is being wired up. You can add competitors manually in the meantime.",
    });
  };

  const handleGenerateScript = (topic: string) => {
    navigate(`/youtube/scripts?topic=${encodeURIComponent(topic)}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Competitor Intelligence</h1>
        <p className="text-muted-foreground mt-1">
          Track competing channels, receive alerts, and uncover content gaps for your clients
        </p>
      </div>

      {/* Client Channel Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Client Channel
              </label>
              <Select
                value={selectedClientChannel}
                onValueChange={(val) =>
                  setSelectedClientChannel(val === "all" ? "" : val)
                }
              >
                <SelectTrigger className="w-full md:w-80">
                  <SelectValue placeholder="All Client Channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Client Channels</SelectItem>
                  {(channels || []).map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>
                      {ch.channel_name || ch.handle || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleDiscoverCompetitors}>
              <Swords className="h-4 w-4 mr-2" />
              Discover Competitors
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tracked Competitors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Swords className="h-5 w-5" />
            Tracked Competitors
            {competitors && competitors.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {competitors.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {competitorsLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              Loading competitors...
            </div>
          ) : !competitors || competitors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Swords className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tracked competitors yet</p>
              <p className="text-sm mt-1">
                Select a client channel and discover competitors to track
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Subscribers
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Sub Gap
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Upload Freq
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Last Video
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((c) => {
                    const subGap = c.sub_gap ?? 0;
                    const gapColor =
                      subGap >= 0 ? "text-green-600" : "text-red-600";
                    return (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="py-3">
                          <div>
                            <p className="font-medium">
                              {c.competitor_name || "Unknown"}
                            </p>
                            {c.competitor_handle && (
                              <p className="text-xs text-muted-foreground">
                                {c.competitor_handle}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 font-semibold">
                          {formatNumber(c.competitor_subscribers)}
                        </td>
                        <td className={`py-3 font-semibold ${gapColor}`}>
                          {subGap >= 0 ? "+" : ""}
                          {formatNumber(Math.abs(subGap))}
                        </td>
                        <td className="py-3">
                          {c.upload_freq_comparison ? (
                            <Badge variant="outline" className="text-xs">
                              {c.upload_freq_comparison}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 max-w-[240px]">
                          <p className="truncate" title={c.last_video_title || ""}>
                            {c.last_video_title || (
                              <span className="text-muted-foreground">
                                No recent video
                              </span>
                            )}
                          </p>
                          {c.last_video_published_at && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(
                                c.last_video_published_at,
                              ).toLocaleDateString()}
                            </p>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeCompetitor.mutate(c.id)}
                            disabled={removeCompetitor.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts Feed */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5" />
              Recent Alerts
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount} unread
                </Badge>
              )}
            </CardTitle>
            <div className="flex gap-1 rounded-md border p-1">
              <Button
                size="sm"
                variant={alertTab === "all" ? "secondary" : "ghost"}
                onClick={() => setAlertTab("all")}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={alertTab === "unread" ? "secondary" : "ghost"}
                onClick={() => setAlertTab("unread")}
              >
                Unread
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {alertsLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              Loading alerts...
            </div>
          ) : !alerts || alerts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                {alertTab === "unread"
                  ? "No unread alerts"
                  : "No alerts yet"}
              </p>
              <p className="text-sm mt-1">
                Alerts will appear here as competitors publish new content
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert: YTCompetitorAlert) => {
                const style = getAlertStyle(alert.alert_type);
                const Icon = style.icon;
                return (
                  <div
                    key={alert.id}
                    className={`rounded-lg border border-l-4 ${style.border} p-4 ${
                      alert.is_read ? "opacity-70" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={style.badge}>
                            {alert.alert_type.replace(/_/g, " ")}
                          </Badge>
                          {alert.urgency && (
                            <Badge variant="outline" className="text-xs">
                              {alert.urgency}
                            </Badge>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                        <p className="font-semibold mt-1">{alert.title}</p>
                        {alert.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {alert.description}
                          </p>
                        )}
                        {alert.competitor_name && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Competitor: {alert.competitor_name}
                            {alert.video_views !== null && (
                              <>
                                {" "}
                                •{" "}
                                <Eye className="h-3 w-3 inline" />{" "}
                                {formatFullNumber(alert.video_views)} views
                              </>
                            )}
                          </p>
                        )}
                        {alert.suggested_action && (
                          <div className="mt-2 p-2 rounded bg-muted/50 text-sm">
                            <span className="font-medium">Suggested: </span>
                            {alert.suggested_action}
                          </div>
                        )}
                      </div>
                      {!alert.is_read && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markRead.mutate(alert.id)}
                          disabled={markRead.isPending}
                        >
                          Mark Read
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Gaps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5" />
            Content Gaps
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contentGaps.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No content gaps detected yet</p>
              <p className="text-sm mt-1">
                Track competitors to identify topics you can cover
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {contentGaps.map((gap) => (
                <div
                  key={gap.topic}
                  className="flex items-center gap-2 rounded-full border bg-muted/40 pl-4 pr-2 py-2"
                >
                  <span className="text-sm font-medium">{gap.topic}</span>
                  {gap.count > 1 && (
                    <Badge variant="secondary" className="text-xs">
                      x{gap.count}
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1"
                    onClick={() => handleGenerateScript(gap.topic)}
                  >
                    <FileText className="h-3 w-3" />
                    Generate Script
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
