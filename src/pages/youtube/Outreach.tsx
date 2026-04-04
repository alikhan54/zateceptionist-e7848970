import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Send,
  Target,
  MessageSquare,
  DollarSign,
  Megaphone,
  Users,
} from "lucide-react";
import {
  useYTOutreachCampaigns,
  useCreateYTCampaign,
  useLaunchCampaign,
  useUpdateCampaignStatus,
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

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-600 border-gray-500/30",
  active: "bg-green-500/10 text-green-600 border-green-500/30",
  paused: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  completed: "bg-blue-500/10 text-blue-600 border-blue-500/30",
};

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);

export default function Outreach() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetNiche, setTargetNiche] = useState("");
  const [subRangeMin, setSubRangeMin] = useState("");
  const [subRangeMax, setSubRangeMax] = useState("");
  const [emailTemplate, setEmailTemplate] = useState("");
  const [includeThumbnails, setIncludeThumbnails] = useState(false);
  const [includeSeoPackage, setIncludeSeoPackage] = useState(false);

  const { data: campaigns, isLoading } = useYTOutreachCampaigns();
  const createCampaign = useCreateYTCampaign();
  const launchCampaign = useLaunchCampaign();
  const updateStatus = useUpdateCampaignStatus();

  const handleCreate = () => {
    if (!name.trim()) return;
    createCampaign.mutate({
      name: name.trim(),
      description: description || null,
      target_niche: targetNiche || null,
      target_sub_range_min: subRangeMin ? Number(subRangeMin) : null,
      target_sub_range_max: subRangeMax ? Number(subRangeMax) : null,
      email_template: emailTemplate || null,
      whatsapp_template: null,
      dm_template: null,
      include_thumbnails: includeThumbnails,
      include_seo_package: includeSeoPackage,
      include_banner: false,
      status: "draft",
    });
    // Reset form
    setName("");
    setDescription("");
    setTargetNiche("");
    setSubRangeMin("");
    setSubRangeMax("");
    setEmailTemplate("");
    setIncludeThumbnails(false);
    setIncludeSeoPackage(false);
  };

  // Stats
  const totalCampaigns = campaigns?.length || 0;
  const activeCampaigns =
    campaigns?.filter((c) => c.status === "active").length || 0;
  const totalResponses =
    campaigns?.reduce((sum, c) => sum + c.responses_received, 0) || 0;
  const totalRevenue =
    campaigns?.reduce((sum, c) => sum + c.total_revenue, 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Outreach Campaigns</h1>
        <p className="text-muted-foreground mt-1">
          Manage outreach campaigns to YouTube channels
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{totalCampaigns}</p>
            <p className="text-sm text-muted-foreground">Total Campaigns</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {activeCampaigns}
            </p>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{totalResponses}</p>
            <p className="text-sm text-muted-foreground">Responses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {formatCurrency(totalRevenue)}
            </p>
            <p className="text-sm text-muted-foreground">Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Creation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="h-5 w-5" />
            Create Campaign
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                placeholder="e.g. Q2 Gaming Outreach"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Target Niche</Label>
              <Select value={targetNiche} onValueChange={setTargetNiche}>
                <SelectTrigger>
                  <SelectValue placeholder="Select niche" />
                </SelectTrigger>
                <SelectContent>
                  {NICHE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n.charAt(0).toUpperCase() + n.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-min">Min Subscribers</Label>
              <Input
                id="sub-min"
                type="number"
                placeholder="e.g. 5000"
                value={subRangeMin}
                onChange={(e) => setSubRangeMin(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-max">Max Subscribers</Label>
              <Input
                id="sub-max"
                type="number"
                placeholder="e.g. 500000"
                value={subRangeMax}
                onChange={(e) => setSubRangeMax(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Brief campaign description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-template">Email Template</Label>
            <Textarea
              id="email-template"
              placeholder="Hi {{channel_name}}, ..."
              rows={4}
              value={emailTemplate}
              onChange={(e) => setEmailTemplate(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-thumbnails"
                checked={includeThumbnails}
                onCheckedChange={(checked) =>
                  setIncludeThumbnails(checked === true)
                }
              />
              <Label htmlFor="include-thumbnails" className="text-sm cursor-pointer">
                Include Thumbnails
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-seo"
                checked={includeSeoPackage}
                onCheckedChange={(checked) =>
                  setIncludeSeoPackage(checked === true)
                }
              />
              <Label htmlFor="include-seo" className="text-sm cursor-pointer">
                Include SEO Package
              </Label>
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={!name.trim() || createCampaign.isPending}
          >
            {createCampaign.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Create Campaign
          </Button>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              Loading campaigns...
            </div>
          ) : !campaigns || campaigns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No campaigns yet</p>
              <p className="text-sm mt-1">
                Create a campaign above to start outreach
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
                      Niche
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Targeted
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Contacted
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Responses
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Deals
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Revenue
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr
                      key={campaign.id}
                      className="border-b last:border-0"
                    >
                      <td className="py-3 font-medium">{campaign.name}</td>
                      <td className="py-3">
                        {campaign.target_niche ? (
                          <Badge variant="secondary">
                            {campaign.target_niche}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">Any</span>
                        )}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className={
                            STATUS_COLORS[campaign.status] ||
                            STATUS_COLORS.draft
                          }
                        >
                          {campaign.status}
                        </Badge>
                      </td>
                      <td className="py-3">{campaign.channels_targeted}</td>
                      <td className="py-3">{campaign.channels_contacted}</td>
                      <td className="py-3">{campaign.responses_received}</td>
                      <td className="py-3">{campaign.deals_closed}</td>
                      <td className="py-3 font-semibold">
                        {formatCurrency(campaign.total_revenue)}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          {campaign.status === "draft" && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => launchCampaign.mutate(campaign.id)}
                              disabled={launchCampaign.isPending}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Launch
                            </Button>
                          )}
                          {campaign.status === "active" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus.mutate({ id: campaign.id, status: "paused" })}
                              disabled={updateStatus.isPending}
                            >
                              Pause
                            </Button>
                          )}
                          {campaign.status === "paused" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus.mutate({ id: campaign.id, status: "active" })}
                              disabled={updateStatus.isPending}
                            >
                              Resume
                            </Button>
                          )}
                        </div>
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
