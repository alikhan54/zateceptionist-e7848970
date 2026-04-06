import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FlaskConical,
  Trophy,
  TrendingUp,
  Loader2,
  Plus,
  ImageOff,
  BarChart3,
  Sparkles,
} from "lucide-react";
import {
  useYTChannels,
  useYTABTests,
  useCreateABTest,
  useUpdateABTest,
  type YTThumbnailTest,
} from "@/hooks/useYouTubeAgency";

const NICHE_OPTIONS = [
  "gaming",
  "fitness",
  "cooking",
  "beauty",
  "technology",
  "education",
  "entertainment",
  "music",
  "vlogs",
  "self_improvement",
  "other",
];

export default function ABTesting() {
  const { data: channels = [] } = useYTChannels();
  const { data: tests = [], isLoading } = useYTABTests();
  const createTest = useCreateABTest();
  const updateTest = useUpdateABTest();

  const [showCreate, setShowCreate] = useState(false);
  const [resultsTest, setResultsTest] = useState<YTThumbnailTest | null>(null);

  // Create form state
  const [newChannel, setNewChannel] = useState("");
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newVariantA, setNewVariantA] = useState("");
  const [newVariantB, setNewVariantB] = useState("");
  const [newNiche, setNewNiche] = useState("");

  // Results form state
  const [impA, setImpA] = useState("");
  const [clicksA, setClicksA] = useState("");
  const [impB, setImpB] = useState("");
  const [clicksB, setClicksB] = useState("");

  const activeTests = useMemo(
    () => tests.filter((t) => t.status === "active"),
    [tests]
  );
  const completedTests = useMemo(
    () => tests.filter((t) => t.status === "completed"),
    [tests]
  );

  const insights = useMemo(() => {
    if (completedTests.length === 0) {
      return { avgLift: 0, totalTests: 0, byNiche: [] as { niche: string; avgLift: number; count: number }[] };
    }
    const totalLift = completedTests.reduce(
      (sum, t) => sum + (Number(t.ctr_lift_pct) || 0),
      0
    );
    const avgLift = Math.round((totalLift / completedTests.length) * 10) / 10;

    const nicheMap = new Map<string, { sum: number; count: number }>();
    completedTests.forEach((t) => {
      const niche = t.niche || "other";
      const cur = nicheMap.get(niche) || { sum: 0, count: 0 };
      cur.sum += Number(t.ctr_lift_pct) || 0;
      cur.count++;
      nicheMap.set(niche, cur);
    });
    const byNiche = Array.from(nicheMap.entries()).map(([niche, data]) => ({
      niche,
      avgLift: Math.round((data.sum / data.count) * 10) / 10,
      count: data.count,
    }));

    return { avgLift, totalTests: completedTests.length, byNiche };
  }, [completedTests]);

  const handleCreate = () => {
    if (!newChannel || !newVideoTitle || !newVariantA || !newVariantB) return;
    createTest.mutate(
      {
        channel_id: newChannel,
        video_title: newVideoTitle,
        video_url: newVideoUrl || null,
        variant_a_description: newVariantA,
        variant_b_description: newVariantB,
        niche: newNiche || null,
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          setNewChannel("");
          setNewVideoTitle("");
          setNewVideoUrl("");
          setNewVariantA("");
          setNewVariantB("");
          setNewNiche("");
        },
      }
    );
  };

  const handleSubmitResults = () => {
    if (!resultsTest) return;
    const a_imp = Number(impA);
    const a_clicks = Number(clicksA);
    const b_imp = Number(impB);
    const b_clicks = Number(clicksB);
    if (!a_imp || !b_imp) return;

    const a_ctr = Math.round((a_clicks / a_imp) * 1000) / 10;
    const b_ctr = Math.round((b_clicks / b_imp) * 1000) / 10;
    const winner = a_ctr > b_ctr ? "variant_a" : b_ctr > a_ctr ? "variant_b" : "inconclusive";
    const winnerCtr = Math.max(a_ctr, b_ctr);
    const loserCtr = Math.min(a_ctr, b_ctr);
    const lift = loserCtr > 0 ? Math.round(((winnerCtr - loserCtr) / loserCtr) * 1000) / 10 : 0;

    updateTest.mutate(
      {
        id: resultsTest.id,
        variant_a_impressions: a_imp,
        variant_a_clicks: a_clicks,
        variant_a_ctr: a_ctr,
        variant_b_impressions: b_imp,
        variant_b_clicks: b_clicks,
        variant_b_ctr: b_ctr,
        winner,
        ctr_lift_pct: lift,
        status: "completed",
        completed_at: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          setResultsTest(null);
          setImpA("");
          setClicksA("");
          setImpB("");
          setClicksB("");
        },
      }
    );
  };

  const formatNumber = (n: number | null | undefined) =>
    n != null ? new Intl.NumberFormat("en-US").format(n) : "—";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Thumbnail A/B Testing</h1>
          <p className="text-muted-foreground mt-1">
            Test thumbnail variants and learn what drives CTR for your clients
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Test
        </Button>
      </div>

      {/* Insights Panel */}
      {completedTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Insights from {insights.totalTests} Completed Test{insights.totalTests > 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Average CTR Lift</p>
                <p className="text-3xl font-bold text-green-600">+{insights.avgLift}%</p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Tests Completed</p>
                <p className="text-3xl font-bold">{insights.totalTests}</p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Active Tests</p>
                <p className="text-3xl font-bold">{activeTests.length}</p>
              </div>
            </div>
            {insights.byNiche.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Per-Niche Performance</p>
                <div className="flex flex-wrap gap-2">
                  {insights.byNiche.map((n) => (
                    <Badge key={n.niche} variant="secondary" className="px-3 py-1">
                      {n.niche}: +{n.avgLift}% lift ({n.count} test{n.count > 1 ? "s" : ""})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-blue-500" />
            Active Tests ({activeTests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeTests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No active tests. Click "New Test" to start tracking a thumbnail experiment.
            </p>
          ) : (
            <div className="space-y-4">
              {activeTests.map((test) => (
                <div key={test.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{test.video_title}</h3>
                      {test.niche && (
                        <Badge variant="outline" className="mt-1">
                          {test.niche}
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setResultsTest(test)}
                    >
                      Enter Results
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded-md p-3 bg-muted/30">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">VARIANT A</p>
                      {test.variant_a_image_url ? (
                        <img
                          src={test.variant_a_image_url}
                          alt="Variant A"
                          className="w-full h-32 object-cover rounded mb-2"
                        />
                      ) : (
                        <div className="w-full h-32 bg-muted rounded mb-2 flex items-center justify-center">
                          <ImageOff className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <p className="text-sm">{test.variant_a_description}</p>
                    </div>
                    <div className="border rounded-md p-3 bg-muted/30">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">VARIANT B</p>
                      {test.variant_b_image_url ? (
                        <img
                          src={test.variant_b_image_url}
                          alt="Variant B"
                          className="w-full h-32 object-cover rounded mb-2"
                        />
                      ) : (
                        <div className="w-full h-32 bg-muted rounded mb-2 flex items-center justify-center">
                          <ImageOff className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <p className="text-sm">{test.variant_b_description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Completed Tests ({completedTests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedTests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No completed tests yet.
            </p>
          ) : (
            <div className="space-y-4">
              {completedTests.map((test) => (
                <div key={test.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{test.video_title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {test.niche && <Badge variant="outline">{test.niche}</Badge>}
                        <Badge className="bg-green-500/10 text-green-700 border-green-500/30">
                          <TrendingUp className="h-3 w-3 mr-1" />+{test.ctr_lift_pct}% CTR Lift
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div
                      className={`border rounded-md p-3 ${
                        test.winner === "variant_a"
                          ? "border-green-500 bg-green-500/5"
                          : "bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-muted-foreground">VARIANT A</p>
                        {test.winner === "variant_a" && (
                          <Badge className="bg-green-500 text-white">
                            <Trophy className="h-3 w-3 mr-1" /> WINNER
                          </Badge>
                        )}
                      </div>
                      {test.variant_a_image_url && (
                        <img
                          src={test.variant_a_image_url}
                          alt="Variant A"
                          className="w-full h-32 object-cover rounded mb-2"
                        />
                      )}
                      <p className="text-sm mb-2">{test.variant_a_description}</p>
                      <div className="flex justify-between text-xs">
                        <span>Imp: {formatNumber(test.variant_a_impressions)}</span>
                        <span>Clicks: {formatNumber(test.variant_a_clicks)}</span>
                        <span className="font-bold">CTR: {test.variant_a_ctr}%</span>
                      </div>
                    </div>
                    <div
                      className={`border rounded-md p-3 ${
                        test.winner === "variant_b"
                          ? "border-green-500 bg-green-500/5"
                          : "bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-muted-foreground">VARIANT B</p>
                        {test.winner === "variant_b" && (
                          <Badge className="bg-green-500 text-white">
                            <Trophy className="h-3 w-3 mr-1" /> WINNER
                          </Badge>
                        )}
                      </div>
                      {test.variant_b_image_url && (
                        <img
                          src={test.variant_b_image_url}
                          alt="Variant B"
                          className="w-full h-32 object-cover rounded mb-2"
                        />
                      )}
                      <p className="text-sm mb-2">{test.variant_b_description}</p>
                      <div className="flex justify-between text-xs">
                        <span>Imp: {formatNumber(test.variant_b_impressions)}</span>
                        <span>Clicks: {formatNumber(test.variant_b_clicks)}</span>
                        <span className="font-bold">CTR: {test.variant_b_ctr}%</span>
                      </div>
                    </div>
                  </div>
                  {test.ai_analysis && (
                    <div className="border-l-4 border-purple-500 pl-3 py-2 bg-purple-500/5 rounded-r">
                      <p className="text-xs font-semibold text-purple-700 mb-1 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> AI ANALYSIS
                      </p>
                      <p className="text-sm">{test.ai_analysis}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Test Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New A/B Test</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Channel</Label>
              <Select value={newChannel} onValueChange={setNewChannel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.channel_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Video Title</Label>
              <Input
                value={newVideoTitle}
                onChange={(e) => setNewVideoTitle(e.target.value)}
                placeholder="e.g. Top 10 Games of 2026"
              />
            </div>
            <div>
              <Label>Video URL (optional)</Label>
              <Input
                value={newVideoUrl}
                onChange={(e) => setNewVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
            <div>
              <Label>Niche</Label>
              <Select value={newNiche} onValueChange={setNewNiche}>
                <SelectTrigger>
                  <SelectValue placeholder="Select niche" />
                </SelectTrigger>
                <SelectContent>
                  {NICHE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Variant A Description</Label>
              <Textarea
                value={newVariantA}
                onChange={(e) => setNewVariantA(e.target.value)}
                placeholder="e.g. Bold red text, shocked face, dramatic lighting"
                rows={3}
              />
            </div>
            <div>
              <Label>Variant B Description</Label>
              <Textarea
                value={newVariantB}
                onChange={(e) => setNewVariantB(e.target.value)}
                placeholder="e.g. Minimalist design, single object, clean white background"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createTest.isPending}>
              {createTest.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Start Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enter Results Dialog */}
      <Dialog open={!!resultsTest} onOpenChange={(open) => !open && setResultsTest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Test Results</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{resultsTest?.video_title}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="font-semibold text-sm">VARIANT A</p>
                <div>
                  <Label>Impressions</Label>
                  <Input
                    type="number"
                    value={impA}
                    onChange={(e) => setImpA(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Clicks</Label>
                  <Input
                    type="number"
                    value={clicksA}
                    onChange={(e) => setClicksA(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <p className="font-semibold text-sm">VARIANT B</p>
                <div>
                  <Label>Impressions</Label>
                  <Input
                    type="number"
                    value={impB}
                    onChange={(e) => setImpB(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Clicks</Label>
                  <Input
                    type="number"
                    value={clicksB}
                    onChange={(e) => setClicksB(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResultsTest(null)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitResults} disabled={updateTest.isPending}>
              {updateTest.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit & Determine Winner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
