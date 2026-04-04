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
  Search,
  Loader2,
  Radar,
  Globe,
  Users,
  TrendingUp,
} from "lucide-react";
import {
  useYTDiscoveryBatches,
  useTriggerDiscovery,
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

const GENDER_OPTIONS = ["male", "female", "mixed"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  running: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  completed: "bg-green-500/10 text-green-600 border-green-500/30",
  failed: "bg-red-500/10 text-red-600 border-red-500/30",
};

export default function Discovery() {
  const [searchQuery, setSearchQuery] = useState("");
  const [niche, setNiche] = useState("");
  const [minSubs, setMinSubs] = useState("");
  const [maxSubs, setMaxSubs] = useState("");
  const [country, setCountry] = useState("");
  const [gender, setGender] = useState("");

  const { data: batches, isLoading } = useYTDiscoveryBatches();
  const triggerDiscovery = useTriggerDiscovery();

  const handleStartDiscovery = () => {
    if (!searchQuery.trim()) return;
    triggerDiscovery.mutate({
      search_query: searchQuery.trim(),
      niche_filter: niche || undefined,
      min_subscribers: minSubs ? Number(minSubs) : undefined,
      max_subscribers: maxSubs ? Number(maxSubs) : undefined,
      country_filter: country || undefined,
      audience_gender_filter: gender || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Channel Discovery</h1>
        <p className="text-muted-foreground mt-1">
          Find and qualify YouTube channels for outreach
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Radar className="h-5 w-5" />
            Discovery Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search-query">Search Query</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-query"
                  placeholder="e.g. fitness workout channels"
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Niche</Label>
              <Select value={niche} onValueChange={setNiche}>
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
              <Label>Audience Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-subs">Min Subscribers</Label>
              <Input
                id="min-subs"
                type="number"
                placeholder="e.g. 1000"
                value={minSubs}
                onChange={(e) => setMinSubs(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-subs">Max Subscribers</Label>
              <Input
                id="max-subs"
                type="number"
                placeholder="e.g. 100000"
                value={maxSubs}
                onChange={(e) => setMaxSubs(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="country"
                  placeholder="e.g. US, AE, GB"
                  className="pl-10"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleStartDiscovery}
            disabled={!searchQuery.trim() || triggerDiscovery.isPending}
            className="w-full md:w-auto"
          >
            {triggerDiscovery.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Start Discovery
          </Button>
        </CardContent>
      </Card>

      {/* Recent Batches */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Discovery Batches</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              Loading batches...
            </div>
          ) : !batches || batches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Radar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No discovery batches yet</p>
              <p className="text-sm mt-1">
                Start a discovery search above to find channels
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">
                      Search Query
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Niche
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Channels Found
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.id} className="border-b last:border-0">
                      <td className="py-3 font-medium">
                        {batch.search_query || "N/A"}
                      </td>
                      <td className="py-3">
                        {batch.niche_filter ? (
                          <Badge variant="secondary">
                            {batch.niche_filter}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">Any</span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">
                            {batch.channels_found}
                          </span>
                          {batch.channels_qualified > 0 && (
                            <span className="text-muted-foreground text-xs">
                              ({batch.channels_qualified} qualified)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className={
                            STATUS_COLORS[batch.status] ||
                            STATUS_COLORS.pending
                          }
                        >
                          {batch.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(batch.created_at).toLocaleDateString()}
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
