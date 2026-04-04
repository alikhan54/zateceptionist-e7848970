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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Users,
  UserCheck,
  Star,
  TrendingUp,
  Eye,
  Mail,
  Image,
  FileText,
} from "lucide-react";
import {
  useYTChannels,
  useYTPipelineStats,
  useTriggerAssetGen,
  useTriggerSeoGen,
  type YTChannel,
} from "@/hooks/useYouTubeAgency";

const PIPELINE_STAGES = [
  { key: "discovered", label: "Discovered", color: "bg-slate-500" },
  { key: "qualified", label: "Qualified", color: "bg-blue-500" },
  { key: "sample_sent", label: "Sample Sent", color: "bg-indigo-500" },
  { key: "in_conversation", label: "In Conversation", color: "bg-purple-500" },
  { key: "negotiating", label: "Negotiating", color: "bg-amber-500" },
  { key: "payment_pending", label: "Payment Pending", color: "bg-orange-500" },
  { key: "active_client", label: "Active Client", color: "bg-green-500" },
];

const formatSubscribers = (count: number): string =>
  Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(count);

export default function Pipeline() {
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<YTChannel | null>(null);

  const { data: channels, isLoading } = useYTChannels(statusFilter || undefined);
  const { data: stats } = useYTPipelineStats();
  const triggerAssets = useTriggerAssetGen();
  const triggerSeo = useTriggerSeoGen();

  const groupedChannels: Record<string, YTChannel[]> = {};
  PIPELINE_STAGES.forEach((stage) => {
    groupedChannels[stage.key] = [];
  });
  (channels || []).forEach((ch) => {
    const key = ch.status.replace(/ /g, "_");
    if (groupedChannels[key]) {
      groupedChannels[key].push(ch);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Channel Pipeline</h1>
          <p className="text-muted-foreground mt-1">
            Track channels through the sales pipeline
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_stages">All Stages</SelectItem>
            {PIPELINE_STAGES.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Channels</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {stats.qualified}
              </p>
              <p className="text-sm text-muted-foreground">Qualified</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {stats.active_client}
              </p>
              <p className="text-sm text-muted-foreground">Active Clients</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">
                {stats.total > 0
                  ? ((stats.active_client / stats.total) * 100).toFixed(1)
                  : "0"}
                %
              </p>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Kanban Columns */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          Loading pipeline...
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const stageChannels = groupedChannels[stage.key] || [];
            return (
              <div
                key={stage.key}
                className="min-w-[280px] max-w-[320px] flex-shrink-0"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                  <h3 className="font-semibold text-sm">{stage.label}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {stageChannels.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {stageChannels.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="p-4 text-center text-sm text-muted-foreground">
                        No channels
                      </CardContent>
                    </Card>
                  ) : (
                    stageChannels.map((ch) => (
                      <Card
                        key={ch.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedChannel(ch)}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <p className="font-semibold text-sm truncate pr-2">
                              {ch.channel_name || ch.handle || "Unknown"}
                            </p>
                            {ch.niche && (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {ch.niche}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {formatSubscribers(ch.subscriber_count)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {formatSubscribers(ch.view_count)}
                            </span>
                          </div>
                          {/* Quality Score Bar */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Quality</span>
                              <span className="font-medium">{ch.quality_score}</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  ch.quality_score >= 70
                                    ? "bg-green-500"
                                    : ch.quality_score >= 40
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                                }`}
                                style={{ width: `${Math.min(ch.quality_score, 100)}%` }}
                              />
                            </div>
                          </div>
                          {ch.last_contacted_at && (
                            <p className="text-xs text-muted-foreground">
                              Last contact:{" "}
                              {new Date(ch.last_contacted_at).toLocaleDateString()}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Channel Detail Dialog */}
      <Dialog
        open={!!selectedChannel}
        onOpenChange={(open) => !open && setSelectedChannel(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedChannel?.channel_name || "Channel Details"}
            </DialogTitle>
          </DialogHeader>
          {selectedChannel && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Handle</p>
                  <p className="font-medium">{selectedChannel.handle || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Subscribers</p>
                  <p className="font-medium">
                    {formatSubscribers(selectedChannel.subscriber_count)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Videos</p>
                  <p className="font-medium">
                    {selectedChannel.video_count.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Views</p>
                  <p className="font-medium">
                    {formatSubscribers(selectedChannel.view_count)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Country</p>
                  <p className="font-medium">{selectedChannel.country || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Niche</p>
                  <p className="font-medium">{selectedChannel.niche || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Quality Score</p>
                  <p className="font-medium">{selectedChannel.quality_score}/100</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="outline">{selectedChannel.status}</Badge>
                </div>
                {selectedChannel.contact_email && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Contact Email</p>
                    <p className="font-medium">{selectedChannel.contact_email}</p>
                  </div>
                )}
                {selectedChannel.description && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Description</p>
                    <p className="text-sm line-clamp-3">
                      {selectedChannel.description}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    triggerAssets.mutate({
                      channel_id: selectedChannel.id,
                      asset_types: ["thumbnail", "banner", "profile_picture"],
                    });
                  }}
                  disabled={triggerAssets.isPending}
                >
                  {triggerAssets.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Image className="h-4 w-4 mr-1" />
                  )}
                  Generate Assets
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    triggerSeo.mutate({
                      channel_id: selectedChannel.id,
                    });
                  }}
                  disabled={triggerSeo.isPending}
                >
                  {triggerSeo.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <FileText className="h-4 w-4 mr-1" />
                  )}
                  Generate SEO
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (selectedChannel.contact_email) {
                      window.open(
                        `mailto:${selectedChannel.contact_email}`,
                        "_blank"
                      );
                    }
                  }}
                  disabled={!selectedChannel.contact_email}
                >
                  <Mail className="h-4 w-4 mr-1" />
                  Send Outreach
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
