import { useState, useEffect, useCallback, useRef } from "react";
import { Brain, Send, RefreshCw, Check, X, Plus, Search, Activity, Shield, Database, Cpu, MessageSquare, Clock, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { PageWrapper } from "@/components/shared/PageWrapper";

const LANGGRAPH_URL = "http://localhost:8123";
const TENANT_ID = "zateceptionist";
const TENANT_UUID = "ac308ab6-f381-4eef-88ec-4d5c7a860ff9";

const AGENT_COLORS: Record<string, string> = {
  OMEGA: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  NOVA: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  PRISM: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  ARIA: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  CORTEX: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  BEACON: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  NEXUS: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const MEMORY_TYPE_COLORS: Record<string, string> = {
  fact: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  preference: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  pattern: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  insight: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  context: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  directive: "bg-red-500/15 text-red-400 border-red-500/30",
};

const ACTION_TYPE_COLORS: Record<string, string> = {
  tool_call: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  respond: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  delegate: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  route: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  learn: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  escalate: "bg-red-500/15 text-red-400 border-red-500/30",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  agent_used?: string;
  execution_time_ms?: number;
  timestamp: Date;
}

// ─── Health Hook ───
function useHealth() {
  const [status, setStatus] = useState<"loading" | "healthy" | "offline">("loading");
  const [data, setData] = useState<any>(null);

  const check = useCallback(async () => {
    try {
      const res = await fetch(`${LANGGRAPH_URL}/health`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
        setStatus("healthy");
      } else setStatus("offline");
    } catch {
      setStatus("offline");
    }
  }, []);

  useEffect(() => { check(); const i = setInterval(check, 60000); return () => clearInterval(i); }, [check]);
  return { status, data, refresh: check };
}

// ─── Chat Tab ───
function ChatTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${LANGGRAPH_URL}/omega`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content, tenant_id: TENANT_ID, tenant_uuid: TENANT_UUID }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.response || data.message || JSON.stringify(data),
        agent_used: data.agent_used,
        execution_time_ms: data.execution_time_ms,
        timestamp: new Date(),
      }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${e.message}`, timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-280px)]">
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-20">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Talk to OMEGA</p>
              <p className="text-sm">Send a message to start a conversation with the super-agent.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-lg px-4 py-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                {msg.agent_used && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className={AGENT_COLORS[msg.agent_used?.toUpperCase()] || ""}>{msg.agent_used}</Badge>
                    {msg.execution_time_ms && <span className="text-xs text-muted-foreground">{msg.execution_time_ms}ms</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="border-t p-4 flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Message OMEGA..."
          disabled={loading}
          className="flex-1"
        />
        <Button onClick={send} disabled={loading || !input.trim()} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Activity Feed Tab ───
function ActivityFeedTab() {
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("agent_actions" as any).select("*").order("created_at", { ascending: false }).limit(50);
    setActions(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); const i = setInterval(fetch_, 30000); return () => clearInterval(i); }, [fetch_]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={fetch_} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>
      <div className="space-y-2">
        {actions.length === 0 && !loading && <p className="text-center text-muted-foreground py-8">No activity recorded yet.</p>}
        {actions.map((a: any) => (
          <Card key={a.id} className="p-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-muted-foreground min-w-[90px]">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
              <Badge variant="outline" className={AGENT_COLORS[a.agent_name?.toUpperCase()] || ""}>{a.agent_name || "unknown"}</Badge>
              <Badge variant="outline" className={ACTION_TYPE_COLORS[a.action_type] || ""}>{a.action_type}</Badge>
              {a.tool_name && <Badge variant="secondary" className="text-xs">{a.tool_name}</Badge>}
              <span className="ml-auto">{a.success ? <Check className="h-4 w-4 text-emerald-400" /> : <X className="h-4 w-4 text-red-400" />}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Autonomous Log Tab ───
function AutonomousLogTab() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { toast } = useToast();

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("system_events" as any)
      .select("*")
      .in("event_type", ["autonomous_check", "autonomous_check_cron"])
      .eq("tenant_id", TENANT_UUID)
      .order("created_at", { ascending: false })
      .limit(20);
    setEvents(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const runNow = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch(`${LANGGRAPH_URL}/omega/autonomous`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: TENANT_ID, tenant_uuid: TENANT_UUID }),
      });
      const data = await res.json();
      setRunResult(data);
      toast({ title: "Autonomous check complete" });
      fetch_();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Button onClick={runNow} disabled={running} className="bg-violet-600 hover:bg-violet-700">
          <Zap className={`h-4 w-4 mr-2 ${running ? "animate-spin" : ""}`} /> Run Now
        </Button>
        <Button variant="outline" size="sm" onClick={fetch_}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
      </div>
      {runResult && (
        <Card className="border-violet-500/30 bg-violet-500/5 p-4">
          <p className="text-sm font-medium text-violet-400 mb-2">Latest Run Result</p>
          <pre className="text-xs text-muted-foreground overflow-auto max-h-40">{JSON.stringify(runResult, null, 2)}</pre>
        </Card>
      )}
      <div className="space-y-2">
        {events.length === 0 && !loading && <p className="text-center text-muted-foreground py-8">No autonomous events logged.</p>}
        {events.map((ev: any) => {
          const ed = ev.event_data || {};
          return (
            <Card key={ev.id} className="p-3">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(expanded === ev.id ? null : ev.id)}>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(ev.created_at), { addSuffix: true })}</span>
                  <Badge variant="outline">{ev.event_type}</Badge>
                  {ed.total_checks != null && <span className="text-xs">Checks: {ed.total_checks}</span>}
                  {ed.critical != null && <span className="text-xs text-red-400">Critical: {ed.critical}</span>}
                  {ed.warnings != null && <span className="text-xs text-amber-400">Warnings: {ed.warnings}</span>}
                </div>
                {expanded === ev.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
              {expanded === ev.id && (
                <pre className="text-xs text-muted-foreground mt-3 overflow-auto max-h-60 bg-muted/50 rounded p-2">{JSON.stringify(ed, null, 2)}</pre>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Approval Queue Tab ───
function ApprovalQueueTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("agent_actions" as any)
      .select("*")
      .eq("output_data->>status", "needs_approval")
      .order("created_at", { ascending: false })
      .limit(20);
    setItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const updatedOutput = { ...(item.output_data || {}), status };
    await supabase.from("agent_actions" as any).update({ output_data: updatedOutput }).eq("id", id);
    toast({ title: `Action ${status}` });
    fetch_();
  };

  if (!loading && items.length === 0) {
    return (
      <div className="text-center py-20">
        <Check className="h-12 w-12 mx-auto mb-4 text-emerald-400 opacity-50" />
        <p className="text-lg font-medium text-muted-foreground">No pending approvals</p>
        <p className="text-sm text-muted-foreground">All clear — OMEGA has nothing waiting for your review.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item: any) => (
        <Card key={item.id} className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={AGENT_COLORS[item.agent_name?.toUpperCase()] || ""}>{item.agent_name}</Badge>
                <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
              </div>
              {item.input_data && <p className="text-sm"><span className="font-medium">Action:</span> {JSON.stringify(item.input_data)}</p>}
              {item.output_data?.reason && <p className="text-sm text-muted-foreground"><span className="font-medium">Reason:</span> {item.output_data.reason}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => handleAction(item.id, "approved")}>
                <Check className="h-4 w-4 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => handleAction(item.id, "rejected")}>
                <X className="h-4 w-4 mr-1" /> Reject
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Memory Tab ───
function MemoryTab() {
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newMem, setNewMem] = useState({ key: "", value: "", memory_type: "fact", confidence: [80] });
  const { toast } = useToast();

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("agent_memory" as any)
      .select("*")
      .eq("tenant_id", TENANT_ID)
      .order("updated_at", { ascending: false })
      .limit(50);
    setMemories(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const filtered = memories.filter(m => !search || m.key?.toLowerCase().includes(search.toLowerCase()));

  const addMemory = async () => {
    if (!newMem.key.trim()) return;
    await supabase.from("agent_memory" as any).insert({
      tenant_id: TENANT_ID,
      key: newMem.key,
      value: newMem.value,
      memory_type: newMem.memory_type,
      confidence: newMem.confidence[0] / 100,
      source_agent: "OMEGA",
      access_count: 0,
    });
    toast({ title: "Memory added" });
    setAddOpen(false);
    setNewMem({ key: "", value: "", memory_type: "fact", confidence: [80] });
    fetch_();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search memories..." className="pl-9" />
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Memory</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Memory</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Key</Label><Input value={newMem.key} onChange={e => setNewMem({ ...newMem, key: e.target.value })} placeholder="e.g. preferred_greeting" /></div>
              <div><Label>Value</Label><Textarea value={newMem.value} onChange={e => setNewMem({ ...newMem, value: e.target.value })} placeholder="Memory content..." /></div>
              <div>
                <Label>Type</Label>
                <Select value={newMem.memory_type} onValueChange={v => setNewMem({ ...newMem, memory_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["fact", "preference", "pattern", "insight", "context", "directive"].map(t => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Confidence: {newMem.confidence[0]}%</Label>
                <Slider value={newMem.confidence} onValueChange={v => setNewMem({ ...newMem, confidence: v })} max={100} step={1} className="mt-2" />
              </div>
              <Button onClick={addMemory} className="w-full">Save Memory</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.length === 0 && !loading && <p className="text-muted-foreground col-span-2 text-center py-8">No memories found.</p>}
        {filtered.map((m: any) => (
          <Card key={m.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <p className="font-semibold text-sm">{m.key}</p>
              <Badge variant="outline" className={MEMORY_TYPE_COLORS[m.memory_type] || ""}>{m.memory_type}</Badge>
            </div>
            <p className="text-xs text-muted-foreground break-all">{typeof m.value === "object" ? JSON.stringify(m.value) : m.value}</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Confidence</span>
                <span>{Math.round((m.confidence || 0) * 100)}%</span>
              </div>
              <Progress value={(m.confidence || 0) * 100} className="h-1.5" />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Source: {m.source_agent || "—"}</span>
              <span>Used {m.access_count || 0}×</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Updated {formatDistanceToNow(new Date(m.updated_at || m.created_at), { addSuffix: true })}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── System Status Tab ───
function SystemStatusTab({ healthData, healthStatus, refreshHealth }: { healthData: any; healthStatus: string; refreshHealth: () => void }) {
  const [omegaMode, setOmegaMode] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("tenant_config" as any).select("ai_agent_mode").eq("tenant_id", TENANT_ID).single().then(({ data }) => {
      if (data?.ai_agent_mode) setOmegaMode(data.ai_agent_mode);
    });
  }, []);

  const changeMode = async (mode: string) => {
    await supabase.from("tenant_config" as any).update({ ai_agent_mode: mode }).eq("tenant_id", TENANT_ID);
    setOmegaMode(mode);
    toast({ title: `OMEGA mode set to ${mode}` });
  };

  const agents = healthData?.agents || [];
  const channels = healthData?.channel_support || [];

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <Cpu className="h-5 w-5 text-violet-400" />
            <span className="font-medium">LangGraph</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${healthStatus === "healthy" ? "bg-emerald-400" : "bg-red-400"}`} />
            <span className="text-sm">{healthStatus === "healthy" ? "Connected" : "Offline"}</span>
          </div>
          {healthData?.version && <p className="text-xs text-muted-foreground mt-1">v{healthData.version}</p>}
          {agents.length > 0 && <p className="text-xs text-muted-foreground">{agents.length} agents</p>}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="h-5 w-5 text-amber-400" />
            <span className="font-medium">n8n</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="text-sm">Connected</span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <Database className="h-5 w-5 text-emerald-400" />
            <span className="font-medium">Supabase</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="text-sm">Connected</span>
          </div>
        </Card>
      </div>

      {/* OMEGA Mode */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">OMEGA Mode</p>
            <p className="text-sm text-muted-foreground">Current operational mode for the AI agent system</p>
          </div>
          <Select value={omegaMode} onValueChange={changeMode}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Select mode" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="omega">OMEGA</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Agent Roster */}
      {agents.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">Agent Roster</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent: any) => (
              <Card key={agent.name} className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`h-2 w-2 rounded-full ${agent.status === "active" ? "bg-emerald-400" : "bg-red-400"}`} />
                  <Badge variant="outline" className={AGENT_COLORS[agent.name?.toUpperCase()] || ""}>{agent.name}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{agent.description || "No description"}</p>
                {agent.tool_count != null && <p className="text-xs text-muted-foreground mt-1">{agent.tool_count} tools</p>}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Channels */}
      {channels.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">Channel Support</h3>
          <div className="flex flex-wrap gap-2">
            {channels.map((ch: string) => (
              <Badge key={ch} variant="secondary">{ch}</Badge>
            ))}
          </div>
        </div>
      )}

      <Button variant="outline" size="sm" onClick={refreshHealth}><RefreshCw className="h-4 w-4 mr-2" /> Refresh Status</Button>
    </div>
  );
}

// ─── Main Page ───
export default function OmegaCommandCenter() {
  const { status, data: healthData, refresh: refreshHealth } = useHealth();

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <Brain className="h-6 w-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">OMEGA Command Center</h1>
              <p className="text-sm text-muted-foreground">Cross-Brain Super-Agent | LangGraph + n8n</p>
            </div>
          </div>
          <Badge variant="outline" className={status === "healthy" ? "border-emerald-500/30 text-emerald-400" : "border-red-500/30 text-red-400"}>
            <span className={`h-2 w-2 rounded-full mr-2 ${status === "healthy" ? "bg-emerald-400" : status === "offline" ? "bg-red-400" : "bg-amber-400 animate-pulse"}`} />
            {status === "healthy" ? "Healthy" : status === "offline" ? "Offline" : "Checking..."}
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="chat"><MessageSquare className="h-4 w-4 mr-1.5 hidden sm:inline" /> Chat</TabsTrigger>
            <TabsTrigger value="activity"><Activity className="h-4 w-4 mr-1.5 hidden sm:inline" /> Activity</TabsTrigger>
            <TabsTrigger value="autonomous"><Zap className="h-4 w-4 mr-1.5 hidden sm:inline" /> Autonomous</TabsTrigger>
            <TabsTrigger value="approvals"><Shield className="h-4 w-4 mr-1.5 hidden sm:inline" /> Approvals</TabsTrigger>
            <TabsTrigger value="memory"><Database className="h-4 w-4 mr-1.5 hidden sm:inline" /> Memory</TabsTrigger>
            <TabsTrigger value="system"><Cpu className="h-4 w-4 mr-1.5 hidden sm:inline" /> System</TabsTrigger>
          </TabsList>
          <TabsContent value="chat"><ChatTab /></TabsContent>
          <TabsContent value="activity"><ActivityFeedTab /></TabsContent>
          <TabsContent value="autonomous"><AutonomousLogTab /></TabsContent>
          <TabsContent value="approvals"><ApprovalQueueTab /></TabsContent>
          <TabsContent value="memory"><MemoryTab /></TabsContent>
          <TabsContent value="system"><SystemStatusTab healthData={healthData} healthStatus={status} refreshHealth={refreshHealth} /></TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}
