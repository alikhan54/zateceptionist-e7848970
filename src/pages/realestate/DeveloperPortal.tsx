import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Key, Plus, Copy, Trash2, Activity, Code, Shield } from "lucide-react";
import { RTLWrapper } from "@/components/realestate/RTLWrapper";
import { useDeveloperAPI } from "@/hooks/useDeveloperAPI";
import { toast } from "sonner";

const ENDPOINTS = [
  { id: "price_predict", name: "Price Prediction", path: "/re-api/v1", desc: "AI-powered property price prediction with 3/6/12 month forecasts" },
  { id: "yield_calculator", name: "Yield Calculator", path: "/re-api/v1", desc: "Gross and net rental yield calculation with expense modeling" },
  { id: "cross_border", name: "Cross-Border Analysis", path: "/re-api/v1", desc: "Multi-country tax, visa, and financing comparison for 8 corridors" },
  { id: "mortgage", name: "Mortgage Calculator", path: "/re-api/v1", desc: "UAE bank comparison with cross-border EMI conversion" },
  { id: "market_forecast", name: "Market Forecasts", path: "/re-api/v1", desc: "AI market predictions with investment recommendations" },
  { id: "offplan_match", name: "Off-Plan Matcher", path: "/re-api/v1", desc: "Match buyer profiles to off-plan projects with cross-border analysis" },
];

export default function DeveloperPortal() {
  const { keys, isLoading, stats, createKey, revokeKey, isCreating } = useDeveloperAPI();
  const [newKeyName, setNewKeyName] = useState("");
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) { toast.error("Enter a key name"); return; }
    try {
      const key = await createKey({ key_name: newKeyName });
      setShowNewKey(key as unknown as string);
      setNewKeyName("");
      setCreateDialogOpen(false);
      toast.success("API key created!");
    } catch { toast.error("Failed to create key"); }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <RTLWrapper>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Developer API</h1>
            <p className="text-muted-foreground">Embed 420 RE intelligence into your applications via REST API</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Create API Key</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New API Key</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Key Name</Label>
                  <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="e.g., Production, Staging, Mobile App" />
                </div>
                <Button onClick={handleCreateKey} disabled={isCreating} className="w-full">{isCreating ? "Creating..." : "Create Key"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* New Key Display */}
        {showNewKey && (
          <Card className="border-green-300 bg-green-50">
            <CardContent className="p-4">
              <p className="font-medium text-green-800">Your new API key (copy it now — it won't be shown again in full):</p>
              <div className="flex items-center gap-2 mt-2">
                <code className="bg-white px-3 py-2 rounded border text-sm flex-1 font-mono">{showNewKey}</code>
                <Button size="sm" variant="outline" onClick={() => handleCopy(showNewKey)}><Copy className="h-4 w-4" /></Button>
              </div>
              <Button size="sm" variant="ghost" className="mt-2" onClick={() => setShowNewKey(null)}>Dismiss</Button>
            </CardContent>
          </Card>
        )}

        {/* Usage Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Keys</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{isLoading ? "..." : stats.activeKeys}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{isLoading ? "..." : stats.totalCalls.toLocaleString()}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{isLoading ? "..." : stats.callsToday}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Plan</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold capitalize">Free</div><p className="text-xs text-muted-foreground">1,000 calls/day</p></CardContent>
          </Card>
        </div>

        {/* API Keys Table */}
        <Card>
          <CardHeader><CardTitle className="text-lg">API Keys</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <p className="text-muted-foreground">Loading...</p> : keys.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">No API keys yet. Create one to get started.</p>
            ) : (
              <div className="space-y-3">
                {keys.map((k) => (
                  <div key={k.id} className={`flex items-center justify-between p-3 rounded border ${k.status === "active" ? "" : "opacity-50"}`}>
                    <div>
                      <p className="font-medium">{k.key_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{k.key_prefix}...{'*'.repeat(20)}</p>
                      <p className="text-xs text-muted-foreground">{k.total_calls} total calls • {k.calls_today} today • {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "Never used"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={k.status === "active" ? "default" : "secondary"}>{k.status}</Badge>
                      {k.status === "active" && (
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => { revokeKey(k.id); toast.success("Key revoked"); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Endpoints */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Code className="h-5 w-5" />Available Endpoints</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ENDPOINTS.map((ep) => (
                <div key={ep.id} className="border rounded p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{ep.name}</p>
                      <p className="text-xs text-muted-foreground">{ep.desc}</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">POST</Badge>
                  </div>
                  <div className="mt-2 bg-gray-900 text-green-400 p-2 rounded text-xs font-mono overflow-x-auto">
                    curl -X POST https://webhooks.zatesystems.com/webhook/{ep.path} \<br />
                    &nbsp;&nbsp;-H "X-API-Key: YOUR_KEY" \<br />
                    &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
                    &nbsp;&nbsp;-d '{`{"endpoint":"${ep.id}", ...params}`}'
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </RTLWrapper>
  );
}
