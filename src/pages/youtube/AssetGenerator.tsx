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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Image,
  Palette,
  Sparkles,
  Check,
  X,
  ImageOff,
} from "lucide-react";
import {
  useYTChannels,
  useYTAssets,
  useTriggerAssetGen,
  type YTGeneratedAsset,
} from "@/hooks/useYouTubeAgency";

const ASSET_TYPES = [
  { key: "thumbnail", label: "Thumbnail" },
  { key: "banner", label: "Banner" },
  { key: "profile_picture", label: "Profile Picture" },
];

const STYLE_PRESETS = ["Gaming", "Vlog", "Educational", "Entertainment", "Minimalist"];

const ASSET_TYPE_COLORS: Record<string, string> = {
  thumbnail: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  banner: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  profile_picture: "bg-teal-500/10 text-teal-600 border-teal-500/30",
};

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "thumbnail", label: "Thumbnails" },
  { key: "banner", label: "Banners" },
  { key: "profile_picture", label: "Profile Pictures" },
];

export default function AssetGenerator() {
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [stylePreset, setStylePreset] = useState("");
  const [filterTab, setFilterTab] = useState("all");

  const { data: channels } = useYTChannels();
  const { data: assets, isLoading } = useYTAssets(
    selectedChannelId || undefined
  );
  const triggerAssetGen = useTriggerAssetGen();

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const handleGenerate = () => {
    if (!selectedChannelId || selectedTypes.length === 0) return;
    triggerAssetGen.mutate({
      channel_id: selectedChannelId,
      asset_types: selectedTypes,
      style_preset: stylePreset || undefined,
    });
  };

  const filteredAssets = (assets || []).filter(
    (a) => filterTab === "all" || a.asset_type === filterTab
  );

  const getQualityColor = (score: number | null): string => {
    if (score === null) return "bg-gray-400";
    if (score > 70) return "bg-green-500";
    if (score > 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Asset Generator</h1>
        <p className="text-muted-foreground mt-1">
          AI-powered thumbnail, banner, and profile picture generation
        </p>
      </div>

      {/* Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5" />
            Generate Assets
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
              <Label>Style Preset</Label>
              <Select value={stylePreset} onValueChange={setStylePreset}>
                <SelectTrigger>
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  {STYLE_PRESETS.map((s) => (
                    <SelectItem key={s} value={s.toLowerCase()}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Asset Types</Label>
            <div className="flex flex-wrap gap-4">
              {ASSET_TYPES.map((type) => (
                <div key={type.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`type-${type.key}`}
                    checked={selectedTypes.includes(type.key)}
                    onCheckedChange={() => toggleType(type.key)}
                  />
                  <Label
                    htmlFor={`type-${type.key}`}
                    className="text-sm cursor-pointer"
                  >
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={
              !selectedChannelId ||
              selectedTypes.length === 0 ||
              triggerAssetGen.isPending
            }
          >
            {triggerAssetGen.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Palette className="h-4 w-4 mr-2" />
            )}
            Generate Assets
          </Button>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <div className="flex gap-1">
        {FILTER_TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={filterTab === tab.key ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilterTab(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Assets Gallery */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          Loading assets...
        </div>
      ) : filteredAssets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No assets found</p>
            <p className="text-sm mt-1">
              Select a channel and generate assets above
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => (
            <Card key={asset.id} className="overflow-hidden">
              {/* Image Preview */}
              <div className="aspect-video bg-muted flex items-center justify-center">
                {asset.image_url ? (
                  <img
                    src={asset.image_url}
                    alt={asset.asset_type}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageOff className="h-12 w-12 text-muted-foreground/50" />
                )}
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={
                      ASSET_TYPE_COLORS[asset.asset_type] ||
                      "bg-gray-500/10 text-gray-600"
                    }
                  >
                    {asset.asset_type.replace(/_/g, " ")}
                  </Badge>
                  {asset.primary_provider && (
                    <Badge variant="secondary" className="text-xs">
                      {asset.primary_provider}
                    </Badge>
                  )}
                </div>

                {/* Quality Score Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Quality Score</span>
                    <span
                      className={`font-semibold ${
                        (asset.quality_score ?? 0) > 70
                          ? "text-green-600"
                          : (asset.quality_score ?? 0) > 40
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {asset.quality_score ?? "N/A"}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getQualityColor(
                        asset.quality_score
                      )}`}
                      style={{
                        width: `${Math.min(asset.quality_score ?? 0, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {asset.style_preset && (
                  <p className="text-xs text-muted-foreground">
                    Style: {asset.style_preset}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={asset.is_approved ? "default" : "outline"}
                    className="flex-1"
                    disabled={asset.is_approved}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    {asset.is_approved ? "Approved" : "Approve"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    disabled={asset.is_approved}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Reject
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
