import { useState } from "react";
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
  Loader2,
  Search,
  FileText,
  TrendingUp,
  Copy,
  Check,
  Hash,
  BarChart3,
} from "lucide-react";
import {
  useYTChannels,
  useYTSeoPackages,
  useTriggerSeoGen,
  type YTSeoPackage,
} from "@/hooks/useYouTubeAgency";

const STATUS_COLORS: Record<string, string> = {
  generated: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  reviewed: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  sent: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  applied: "bg-green-500/10 text-green-600 border-green-500/30",
};

const RANKING_COLORS: Record<string, string> = {
  high: "bg-green-500/10 text-green-600 border-green-500/30",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  low: "bg-red-500/10 text-red-600 border-red-500/30",
};

export default function SeoEngine() {
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: channels } = useYTChannels();
  const { data: packages, isLoading } = useYTSeoPackages(
    selectedChannelId || undefined
  );
  const triggerSeo = useTriggerSeoGen();

  const handleGenerate = () => {
    if (!selectedChannelId && !videoUrl) return;
    triggerSeo.mutate({
      channel_id: selectedChannelId || "",
      video_url: videoUrl || undefined,
    });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreRing = (score: number): string => {
    if (score >= 80) return "border-green-500";
    if (score >= 60) return "border-yellow-500";
    return "border-red-500";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">SEO Engine</h1>
        <p className="text-muted-foreground mt-1">
          AI-powered YouTube SEO optimization
        </p>
      </div>

      {/* Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Generate SEO Package
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select
                value={selectedChannelId}
                onValueChange={setSelectedChannelId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {(channels || []).map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>
                      {ch.channel_name || ch.handle || ch.channel_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="video-url">Video URL (optional)</Label>
              <Input
                id="video-url"
                placeholder="https://youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={
              (!selectedChannelId && !videoUrl) || triggerSeo.isPending
            }
          >
            {triggerSeo.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <TrendingUp className="h-4 w-4 mr-2" />
            )}
            Generate SEO Package
          </Button>
        </CardContent>
      </Card>

      {/* SEO Packages */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          Loading SEO packages...
        </div>
      ) : !packages || packages.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No SEO packages yet</p>
            <p className="text-sm mt-1">
              Select a channel and generate an SEO package above
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {packages.map((pkg) => (
            <Card key={pkg.id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* SEO Score */}
                  <div className="flex flex-col items-center justify-center min-w-[100px]">
                    <div
                      className={`w-20 h-20 rounded-full border-4 ${getScoreRing(
                        pkg.seo_score
                      )} flex items-center justify-center`}
                    >
                      <span
                        className={`text-2xl font-bold ${getScoreColor(
                          pkg.seo_score
                        )}`}
                      >
                        {pkg.seo_score}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      SEO Score
                    </p>
                  </div>

                  {/* Details */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            STATUS_COLORS[pkg.status] ||
                            STATUS_COLORS.generated
                          }
                        >
                          {pkg.status}
                        </Badge>
                        {pkg.ranking_potential && (
                          <Badge
                            variant="outline"
                            className={
                              RANKING_COLORS[pkg.ranking_potential] ||
                              RANKING_COLORS.medium
                            }
                          >
                            {pkg.ranking_potential} potential
                          </Badge>
                        )}
                        {pkg.ctr_prediction !== null && (
                          <span className="text-xs text-muted-foreground">
                            CTR: {(pkg.ctr_prediction * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(pkg.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Original Title */}
                    {pkg.video_title && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Original Title
                        </p>
                        <p className="text-sm">{pkg.video_title}</p>
                      </div>
                    )}

                    {/* Optimized Titles */}
                    {pkg.optimized_titles.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Optimized Titles
                        </p>
                        <div className="space-y-1.5">
                          {pkg.optimized_titles.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 text-sm"
                            >
                              <span className="text-muted-foreground font-mono text-xs w-5">
                                {idx + 1}.
                              </span>
                              <span className="flex-1">{item.title}</span>
                              <Badge variant="secondary" className="text-xs">
                                {(item.score * 100).toFixed(0)}% CTR
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {pkg.optimized_tags.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Tags
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {pkg.optimized_tags.map((tag, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Hashtags */}
                    {pkg.hashtags.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Hashtags
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {pkg.hashtags.map((ht, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs"
                            >
                              <Hash className="h-3 w-3 mr-0.5" />
                              {ht.replace(/^#/, "")}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Copy Description */}
                    {pkg.optimized_description && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            Description
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() =>
                              handleCopy(pkg.optimized_description!, pkg.id)
                            }
                          >
                            {copiedId === pkg.id ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <Copy className="h-3 w-3 mr-1" />
                            )}
                            {copiedId === pkg.id ? "Copied" : "Copy"}
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {pkg.optimized_description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
