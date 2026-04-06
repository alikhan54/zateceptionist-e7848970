import { useState, useMemo } from "react";
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
  Plug,
  Loader2,
  Activity,
  Users,
  TrendingUp,
  DollarSign,
  Eye,
  Clock,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import {
  useYTChannels,
  useYTOAuthConnections,
  useYTAnalyticsSnapshots,
} from "@/hooks/useYouTubeAgency";

export default function YouTubeConnect() {
  const { data: channels = [] } = useYTChannels();
  const { data: connections = [], isLoading } = useYTOAuthConnections();
  const { toast } = useToast();
  const [selectedChannel, setSelectedChannel] = useState<string>("");

  const { data: snapshots = [] } = useYTAnalyticsSnapshots(selectedChannel || undefined);

  const connectionMap = useMemo(() => {
    const map = new Map<string, (typeof connections)[number]>();
    connections.forEach((c) => {
      if (c.channel_id) map.set(c.channel_id, c);
    });
    return map;
  }, [connections]);

  const connectedChannels = useMemo(
    () => channels.filter((c) => connectionMap.get(c.id)?.status === "connected"),
    [channels, connectionMap]
  );

  const selectedConnection = selectedChannel ? connectionMap.get(selectedChannel) : null;
  const selectedChannelData = selectedChannel
    ? channels.find((c) => c.id === selectedChannel)
    : null;

  const chartData = useMemo(() => {
    return snapshots.map((s) => ({
      date: new Date(s.snapshot_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      ctr: Number(s.ctr) || 0,
      subscribers: s.subscribers || 0,
      revenue: Number(s.estimated_revenue) || 0,
      watchHours: Number(s.watch_time_hours) || 0,
    }));
  }, [snapshots]);

  const latestSnapshot = snapshots[snapshots.length - 1];

  const handleConnectClick = () => {
    toast({
      title: "OAuth Setup Required",
      description:
        "YouTube Connect requires Google Cloud OAuth credentials. See Setup Instructions below.",
    });
  };

  const formatNumber = (n: number | null | undefined) =>
    n != null ? new Intl.NumberFormat("en-US").format(n) : "—";

  const getStatusBadge = (status: string | undefined) => {
    if (status === "connected") {
      return (
        <Badge className="bg-green-500/10 text-green-700 border-green-500/30">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
        </Badge>
      );
    }
    if (status === "pending") {
      return (
        <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30">
          <Clock className="h-3 w-3 mr-1" /> Pending
        </Badge>
      );
    }
    if (status === "expired") {
      return (
        <Badge className="bg-red-500/10 text-red-700 border-red-500/30">
          <AlertCircle className="h-3 w-3 mr-1" /> Expired
        </Badge>
      );
    }
    return <Badge variant="outline">Not Connected</Badge>;
  };

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
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Plug className="h-8 w-8 text-purple-500" />
          YouTube Connect
        </h1>
        <p className="text-muted-foreground mt-1">
          Connect client YouTube accounts to unlock real-time Analytics API data
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Connections</CardTitle>
        </CardHeader>
        <CardContent>
          {channels.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No channels yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-2 font-medium text-muted-foreground">Channel</th>
                    <th className="pb-2 font-medium text-muted-foreground">Status</th>
                    <th className="pb-2 font-medium text-muted-foreground">Last Synced</th>
                    <th className="pb-2 font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map((ch) => {
                    const conn = connectionMap.get(ch.id);
                    return (
                      <tr key={ch.id} className="border-b last:border-0">
                        <td className="py-3 font-medium">{ch.channel_name}</td>
                        <td className="py-3">{getStatusBadge(conn?.status)}</td>
                        <td className="py-3 text-muted-foreground">
                          {conn?.last_synced_at
                            ? new Date(conn.last_synced_at).toLocaleString()
                            : "Never"}
                        </td>
                        <td className="py-3">
                          {conn?.status === "connected" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedChannel(ch.id)}
                            >
                              View Analytics
                            </Button>
                          ) : (
                            <Button size="sm" onClick={handleConnectClick}>
                              <Plug className="h-3 w-3 mr-1" />
                              Connect
                            </Button>
                          )}
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

      {/* Live Analytics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Live Analytics
            </CardTitle>
            {connectedChannels.length > 0 && (
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select connected channel" />
                </SelectTrigger>
                <SelectContent>
                  {connectedChannels.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.channel_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {connectedChannels.length === 0 ? (
            <div className="text-center py-12">
              <Plug className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-2">No connected channels yet.</p>
              <p className="text-sm text-muted-foreground">
                Connect a channel above to unlock real-time CTR, watch time, and revenue analytics.
              </p>
            </div>
          ) : !selectedChannel ? (
            <p className="text-muted-foreground text-center py-8">
              Select a connected channel above to view analytics.
            </p>
          ) : snapshots.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No analytics snapshots yet for {selectedChannelData?.channel_name}.
            </p>
          ) : (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Users className="h-4 w-4" /> Subscribers
                  </div>
                  <p className="text-2xl font-bold">
                    {formatNumber(latestSnapshot?.subscribers)}
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Eye className="h-4 w-4" /> Total Views
                  </div>
                  <p className="text-2xl font-bold">
                    {formatNumber(latestSnapshot?.total_views)}
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <TrendingUp className="h-4 w-4" /> CTR
                  </div>
                  <p className="text-2xl font-bold">{latestSnapshot?.ctr || 0}%</p>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <DollarSign className="h-4 w-4" /> Est. Revenue
                  </div>
                  <p className="text-2xl font-bold">
                    ${formatNumber(latestSnapshot?.estimated_revenue)}
                  </p>
                </div>
              </div>

              {/* CTR Chart */}
              <div>
                <h3 className="text-sm font-semibold mb-3">CTR Over Time</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip />
                    <Line type="monotone" dataKey="ctr" stroke="#7c3aed" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Subscribers Growth */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Subscriber Growth</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="subscribers"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Revenue Bar Chart */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Estimated Revenue</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            Setup Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              To enable real YouTube Analytics integration, set up Google Cloud OAuth credentials:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>
                Go to{" "}
                <a
                  href="https://console.cloud.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Google Cloud Console
                </a>{" "}
                and create a new project (or select an existing one)
              </li>
              <li>Enable both <strong>YouTube Data API v3</strong> and <strong>YouTube Analytics API</strong></li>
              <li>Go to "Credentials" → "Create Credentials" → "OAuth Client ID"</li>
              <li>Configure the OAuth consent screen (External user type)</li>
              <li>
                Add authorized redirect URI:{" "}
                <code className="bg-muted px-1 py-0.5 rounded text-xs">
                  https://ai.zatesystems.com/youtube/oauth-callback
                </code>
              </li>
              <li>
                Add the Client ID and Client Secret to <strong>Settings → Integrations</strong>
              </li>
              <li>
                Have channel owners click "Connect" above to grant access via Google's consent screen
              </li>
            </ol>
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded text-blue-700 text-xs">
              <strong>Required scopes:</strong> youtube.readonly, yt-analytics.readonly
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
