import { useState, useEffect, useCallback, useRef } from "react";
import { Brain, Send, RefreshCw, Check, X, Plus, Search, Activity, Shield, Database, Cpu, MessageSquare, Clock, Zap, ChevronDown, ChevronUp, Mic, MicOff, Volume2, VolumeX, Phone } from "lucide-react";
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
import { callWebhook, WEBHOOKS } from "@/lib/api/webhooks";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";

const AGENT_COLORS: Record<string, string> = {
  OMEGA: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  NOVA: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  PRISM: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  ARIA: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  CORTEX: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  BEACON: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  NEXUS: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  MEDICA: "bg-teal-500/15 text-teal-400 border-teal-500/30",
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

// --- Health Hook ---
function useHealth(tenantId: string) {
  const [status, setStatus] = useState<"loading" | "healthy" | "offline">("loading");
  const [data, setData] = useState<any>(null);

  const check = useCallback(async () => {
    try {
      const res = await callWebhook(WEBHOOKS.OMEGA_HEALTH, {}, tenantId);
      if (res.success && res.data && res.data.status === "healthy") {
        setData(res.data);
        setStatus("healthy");
      } else if (res.success && res.data && res.data.status === "online") {
        setData(res.data);
        setStatus("healthy");
      } else {
        setStatus("offline");
      }
    } catch {
      setStatus("offline");
    }
  }, [tenantId]);

  useEffect(() => { check(); const i = setInterval(check, 60000); return () => clearInterval(i); }, [check]);
  return { status, data, refresh: check };
}

// --- Chat Tab ---
function ChatTab({ tenantId, tenantUuid }: { tenantId: string; tenantUuid: string }) {
  const { user, authUser, isAdmin } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setTimeout(() => {
          sendMessage(transcript);
        }, 400);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === "not-allowed") {
          toast({ title: "Microphone blocked", description: "Please allow microphone access in your browser settings.", variant: "destructive" });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Text-to-speech
  const speakResponse = useCallback((text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v =>
      v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha")
    );
    if (preferredVoice) utterance.voice = preferredVoice;
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
      }
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (overrideMsg?: string) => {
    const msg = (overrideMsg || input).trim();
    if (!msg || loading) return;
    const userMsg: ChatMessage = { role: "user", content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await callWebhook(WEBHOOKS.OMEGA_CHAT, {
        message: userMsg.content,
        channel: "web_chat",
        sender_identifier: user?.email || "",
        sender_type: isAdmin ? "admin" : "team_member",
        tenant_uuid: tenantUuid,
      }, tenantId);
      const data = res.data as any;
      if (res.success && data) {
        const responseText = data.response || data.message || data.error || "OMEGA returned an unexpected response. Please try again.";
        setMessages(prev => [...prev, {
          role: "assistant",
          content: responseText,
          agent_used: data.agent_used,
          execution_time_ms: data.execution_time_ms,
          timestamp: new Date(),
        }]);
        speakResponse(responseText);
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "OMEGA is temporarily unavailable. Please try again.",
          timestamp: new Date(),
        }]);
      }
    } catch {
      toast({ title: "Error", description: "OMEGA is temporarily unavailable. Please try again.", variant: "destructive" });
      setMessages(prev => [...prev, { role: "assistant", content: "OMEGA is temporarily unavailable. Please try again.", timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const send = () => sendMessage();

  return (
    <div className="flex flex-col h-[calc(100vh-280px)]">
      {/* Voice toggle bar */}
      <div className="flex items-center justify-end px-4 pt-2 gap-2">
        {speechSupported && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            title={voiceEnabled ? "Disable voice responses" : "Enable voice responses"}
          >
            {voiceEnabled ? <Volume2 className="h-3.5 w-3.5 text-violet-400" /> : <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />}
            {voiceEnabled ? "Voice On" : "Voice Off"}
          </Button>
        )}
      </div>
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-20">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Talk to OMEGA</p>
              <p className="text-sm">Send a message or tap the mic to speak with the super-agent.</p>
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
                  <span className="text-sm text-muted-foreground">OMEGA is thinking...</span>
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
          placeholder={isListening ? "Listening..." : "Message OMEGA..."}
          disabled={loading || isListening}
          className="flex-1"
        />
        {speechSupported && (
          <Button
            onClick={toggleVoice}
            disabled={loading}
            size="icon"
            variant={isListening ? "destructive" : "ghost"}
            className={isListening ? "animate-pulse" : ""}
            title={isListening ? "Stop listening" : "Voice input"}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        )}
        <Button onClick={send} disabled={loading || !input.trim()} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// --- Activity Feed Tab ---
function ActivityFeedTab({ tenantId }: { tenantId: string }) {
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("agent_actions" as any)
      .select("*, agent_conversations!inner(tenant_id)")
      .eq("agent_conversations.tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(50);
    setActions(data || []);
    setLoading(false);
  }, [tenantId]);

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

// --- Autonomous Log Tab ---
function AutonomousLogTab({ tenantId, tenantUuid }: { tenantId: string; tenantUuid: string }) {
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
      .eq("tenant_id", tenantUuid)
      .order("created_at", { ascending: false })
      .limit(20);
    setEvents(data || []);
    setLoading(false);
  }, [tenantUuid]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const runNow = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await callWebhook(WEBHOOKS.OMEGA_AUTONOMOUS_TRIGGER, {
        tenant_uuid: tenantUuid,
      }, tenantId);
      if (res.success && res.data) {
        setRunResult(res.data);
        toast({ title: "Autonomous check complete" });
        fetch_();
      } else {
        toast({ title: "Error", description: "OMEGA is temporarily unavailable.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "OMEGA is temporarily unavailable.", variant: "destructive" });
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
          <div className="space-y-3 mt-4">
            <div className="flex gap-2 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-500/20 text-violet-400">Issues: {runResult.issues_found ?? 0}</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">Actions: {runResult.actions_taken ?? 0}</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">Warnings: {runResult.warnings_logged ?? 0}</span>
            </div>
            {runResult.details && Array.isArray(runResult.details) && runResult.details.map((d: any, i: number) => (
              <div key={i} className="text-sm p-3 rounded-lg bg-muted/50 border border-border">
                <span className={`font-semibold ${d.severity === 'critical' ? 'text-red-400' : d.severity === 'warning' ? 'text-yellow-400' : 'text-green-400'}`}>
                  [{d.severity?.toUpperCase()}]
                </span>{' '}
                <span className="text-muted-foreground">{d.category}:</span>{' '}
                {d.description || d.message}
              </div>
            ))}
          </div>
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

// --- Approval Queue Tab ---
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
        <p className="text-sm text-muted-foreground">All clear -- OMEGA has nothing waiting for your review.</p>
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

// --- Memory Tab ---
function MemoryTab({ tenantId }: { tenantId: string }) {
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
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false })
      .limit(50);
    setMemories(data || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const filtered = memories.filter(m => !search || m.key?.toLowerCase().includes(search.toLowerCase()));

  const addMemory = async () => {
    if (!newMem.key.trim()) return;
    await supabase.from("agent_memory" as any).insert({
      tenant_id: tenantId,
      key: newMem.key,
      value: newMem.value,
      memory_type: newMem.memory_type,
      confidence: newMem.confidence[0] / 100,
      source_agent: "manual",
      source_brain: "omega",
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
              <span>Source: {m.source_agent || "---"}</span>
              <span>Used {m.access_count || 0}x</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Updated {formatDistanceToNow(new Date(m.updated_at || m.created_at), { addSuffix: true })}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

// --- System Status Tab ---
function SystemStatusTab({ healthData, healthStatus, refreshHealth, tenantId }: { healthData: any; healthStatus: string; refreshHealth: () => void; tenantId: string }) {
  const { user, authUser, isAdmin } = useAuth();
  const [omegaMode, setOmegaMode] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("tenant_config" as any).select("ai_agent_mode").eq("tenant_id", tenantId).single().then(({ data }) => {
      if (data?.ai_agent_mode) setOmegaMode(data.ai_agent_mode);
    });
  }, [tenantId]);

  const changeMode = async (mode: string) => {
    if (!isAdmin) return;
    await supabase.from("tenant_config" as any).update({ ai_agent_mode: mode }).eq("tenant_id", tenantId);
    setOmegaMode(mode);
    toast({ title: `OMEGA mode set to ${mode}` });
  };

  const agents = healthData?.agents || [];
  const channels = healthData?.channel_support || [];

  if (!isAdmin) {
    return (
      <div className="text-center py-20">
        <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-lg font-medium text-muted-foreground">Admin Access Required</p>
        <p className="text-sm text-muted-foreground">Only admins can view system status.</p>
      </div>
    );
  }

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
          <Select value={omegaMode} onValueChange={changeMode} disabled={!isAdmin}>
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

// --- Main Page ---
export default function OmegaCommandCenter() {
  const { tenantId, tenantUuid } = useTenant();
  const { status, data: healthData, refresh: refreshHealth } = useHealth(tenantId || "zateceptionist");

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
            {status === "healthy" ? "Online" : status === "offline" ? "Offline" : "Checking..."}
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
          <TabsContent value="chat"><ChatTab tenantId={tenantId || "zateceptionist"} tenantUuid={tenantUuid || ""} /></TabsContent>
          <TabsContent value="activity"><ActivityFeedTab tenantId={tenantId || "zateceptionist"} /></TabsContent>
          <TabsContent value="autonomous"><AutonomousLogTab tenantId={tenantId || "zateceptionist"} tenantUuid={tenantUuid || ""} /></TabsContent>
          <TabsContent value="approvals"><ApprovalQueueTab /></TabsContent>
          <TabsContent value="memory"><MemoryTab tenantId={tenantId || "zateceptionist"} /></TabsContent>
          <TabsContent value="system"><SystemStatusTab healthData={healthData} healthStatus={status} refreshHealth={refreshHealth} tenantId={tenantId || "zateceptionist"} /></TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}
