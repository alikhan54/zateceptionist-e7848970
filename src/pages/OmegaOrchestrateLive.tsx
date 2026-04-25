import { useState, useRef, useCallback } from "react";
import { Play, Square, CheckCircle2, XCircle, Loader2, Activity, Zap, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { useTenant } from "@/contexts/TenantContext";

// Endpoint base (LangGraph brain). Existing pages access /omega/channel via
// the n8n webhook proxy — for the orchestrator stream we hit the LangGraph
// HTTPS host directly. If your prod uses a different proxy, change here.
const ORCHESTRATOR_BASE = (import.meta.env.VITE_ORCHESTRATOR_BASE as string) || "https://webhooks.zatesystems.com/webhook/lg";
const STREAM_PATH = "/omega/orchestrate/stream";
const CANCEL_PATH = "/omega/orchestrate/cancel";

type TaskState = "pending" | "running" | "ok" | "failed";
type StreamEvent = {
  type: string;
  request_id?: string;
  // start
  tenant_id?: string;
  goal?: string;
  // plan_generated
  compound?: boolean;
  tasks?: Array<{ id: number; tool: string; depends_on?: number[]; args_preview?: Record<string, unknown> }>;
  summary_intent?: string;
  plan_length?: number;
  // task_*
  task_id?: number;
  tool?: string;
  args_preview?: Record<string, unknown>;
  duration_ms?: number;
  output_preview?: string;
  user_message?: string;
  error_id?: string;
  // all_done
  summary?: string;
  tasks_failed?: number;
  duration_s?: number;
  results_preview?: Array<{ task_id: number; tool: string; success: boolean }>;
  route?: string;
  // interrupted
  completed_count?: number;
  remaining_count?: number;
};

interface TaskCard {
  id: number;
  tool: string;
  depends_on: number[];
  state: TaskState;
  args_preview?: Record<string, unknown>;
  duration_ms?: number;
  output_preview?: string;
  error_message?: string;
}

type Status =
  | "idle"
  | "connecting"
  | "planning"
  | "running"
  | "stopping"
  | "interrupted"
  | "done"
  | "error";

const STATUS_COLOR: Record<Status, string> = {
  idle: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  connecting: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  planning: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  running: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  stopping: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  interrupted: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  done: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  error: "bg-red-500/15 text-red-400 border-red-500/30",
};

const TASK_STATE_ICON: Record<TaskState, JSX.Element> = {
  pending: <Activity className="h-4 w-4 text-slate-400" />,
  running: <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />,
  ok: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  failed: <XCircle className="h-4 w-4 text-red-400" />,
};

export default function OmegaOrchestrateLive() {
  const { tenantId, tenantConfig } = useTenant();
  const [goal, setGoal] = useState("Find 3 painting contractors in Dallas and draft outreach for each");
  const [status, setStatus] = useState<Status>("idle");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [planIntent, setPlanIntent] = useState<string>("");
  const [tasks, setTasks] = useState<TaskCard[]>([]);
  const [synthesis, setSynthesis] = useState<string>("");
  const [serverError, setServerError] = useState<{ user_message: string; error_id: string } | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const startTRef = useRef<number>(0);
  const requestIdRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setRequestId(null);
    requestIdRef.current = null;
    setPlanIntent("");
    setTasks([]);
    setSynthesis("");
    setServerError(null);
    setElapsedMs(0);
  }, []);

  const handleEvent = useCallback((ev: StreamEvent) => {
    switch (ev.type) {
      case "start":
        if (ev.request_id) {
          setRequestId(ev.request_id);
          requestIdRef.current = ev.request_id;
        }
        setStatus("planning");
        return;
      case "plan_generated":
        setPlanIntent(ev.summary_intent || "");
        if (ev.compound && ev.tasks?.length) {
          setTasks(
            ev.tasks.map((t) => ({
              id: t.id,
              tool: t.tool,
              depends_on: t.depends_on || [],
              state: "pending",
              args_preview: t.args_preview,
            })),
          );
          setStatus("running");
        } else {
          // non-compound — short-circuit; all_done will follow
          setTasks([]);
          setStatus("running");
        }
        return;
      case "task_started":
        if (ev.task_id != null) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === ev.task_id
                ? { ...t, state: "running", args_preview: ev.args_preview ?? t.args_preview }
                : t,
            ),
          );
        }
        return;
      case "task_completed":
        if (ev.task_id != null) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === ev.task_id
                ? {
                    ...t,
                    state: "ok",
                    duration_ms: ev.duration_ms,
                    output_preview: ev.output_preview,
                  }
                : t,
            ),
          );
        }
        return;
      case "task_failed":
        if (ev.task_id != null) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === ev.task_id
                ? {
                    ...t,
                    state: "failed",
                    duration_ms: ev.duration_ms,
                    error_message: ev.user_message || ev.output_preview,
                  }
                : t,
            ),
          );
        }
        return;
      case "interrupted":
        setStatus("interrupted");
        return;
      case "briefing_start":
        // No-op visual; status stays running until all_done
        return;
      case "all_done":
        setSynthesis(ev.summary || "");
        // Preserve interrupted status if it was set; otherwise mark done
        setStatus((s) => (s === "interrupted" ? "interrupted" : "done"));
        return;
      case "error":
        setSynthesis("");
        setServerError({
          user_message: ev.user_message || "Orchestrator failed.",
          error_id: ev.error_id || "",
        });
        setStatus("error");
        return;
      default:
        return;
    }
  }, []);

  const execute = useCallback(async () => {
    if (!tenantId || !goal.trim()) return;
    reset();
    setStatus("connecting");
    startTRef.current = performance.now();

    const controller = new AbortController();
    abortRef.current = controller;

    let elapsedTicker: ReturnType<typeof setInterval> | null = null;
    elapsedTicker = setInterval(() => {
      setElapsedMs(Math.round(performance.now() - startTRef.current));
    }, 250);

    try {
      const res = await fetch(`${ORCHESTRATOR_BASE}${STREAM_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
        body: JSON.stringify({
          goal: goal.trim(),
          tenant_id: tenantId,
          tenant_uuid: tenantConfig?.id || "",
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line) continue;
          try {
            const ev = JSON.parse(line) as StreamEvent;
            handleEvent(ev);
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        setServerError({
          user_message: (e as Error)?.message || "Connection failed",
          error_id: "",
        });
        setStatus("error");
      }
    } finally {
      if (elapsedTicker) clearInterval(elapsedTicker);
      abortRef.current = null;
    }
  }, [goal, tenantId, tenantConfig?.id, reset, handleEvent]);

  const stop = useCallback(async () => {
    const rid = requestIdRef.current;
    if (!rid || !tenantId) return;
    setStatus("stopping");
    try {
      await fetch(`${ORCHESTRATOR_BASE}${CANCEL_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: rid, tenant_id: tenantId }),
      });
      // The stream will emit `interrupted` shortly; keep reading until close.
    } catch (e) {
      // Best-effort; user will see status state via the stream itself
      console.warn("cancel failed:", e);
    }
  }, [tenantId]);

  const isInFlight =
    status === "connecting" || status === "planning" || status === "running" || status === "stopping";
  const completed = tasks.filter((t) => t.state === "ok").length;
  const failed = tasks.filter((t) => t.state === "failed").length;

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Zap className="h-6 w-6 text-violet-400" />
              OMEGA Orchestrator
              <Badge variant="outline" className="ml-2 text-xs">live</Badge>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Compound goals decomposed and executed step-by-step. You can stop mid-flight.
            </p>
          </div>
          <Badge variant="outline" className={STATUS_COLOR[status]}>{status}</Badge>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Goal</CardTitle>
            <CardDescription>Describe what you want OMEGA to accomplish across multiple steps.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Find 5 painting contractors in Dallas and draft outreach for each"
              className="min-h-[80px]"
              disabled={isInFlight}
            />
            <div className="flex items-center gap-2 flex-wrap">
              {!isInFlight ? (
                <Button onClick={execute} disabled={!goal.trim() || !tenantId} size="sm">
                  <Play className="h-4 w-4 mr-2" /> Execute
                </Button>
              ) : (
                <Button onClick={stop} variant="destructive" size="sm" disabled={status === "stopping"}>
                  <Square className="h-4 w-4 mr-2" />
                  {status === "stopping" ? "Stopping…" : "Stop"}
                </Button>
              )}
              {(status === "done" || status === "interrupted" || status === "error") && (
                <Button onClick={reset} variant="outline" size="sm">New goal</Button>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {isInFlight && elapsedMs > 0 ? `${(elapsedMs / 1000).toFixed(1)}s` : ""}
                {requestId ? ` · ${requestId.slice(0, 8)}…` : ""}
              </span>
            </div>
          </CardContent>
        </Card>

        {planIntent && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Plan</CardTitle>
              <CardDescription>{planIntent}</CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Goal classified as simple — synthesizing direct response.
                </p>
              ) : (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  {tasks.map((task) => (
                    <Card key={task.id} className="border-slate-700/50">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          {TASK_STATE_ICON[task.state]}
                          <span className="text-sm font-medium">#{task.id}</span>
                          <span className="text-sm font-mono">{task.tool}</span>
                          {task.depends_on.length > 0 && (
                            <Badge variant="outline" className="text-xs">deps: {task.depends_on.join(",")}</Badge>
                          )}
                          <span className="ml-auto text-xs text-muted-foreground">
                            {task.duration_ms != null ? `${(task.duration_ms / 1000).toFixed(1)}s` : ""}
                          </span>
                        </div>
                      </CardHeader>
                      {(task.output_preview || task.error_message) && (
                        <CardContent className="pt-0 pb-3">
                          <ScrollArea className="max-h-32">
                            <p className={`text-xs whitespace-pre-wrap ${task.state === "failed" ? "text-red-400" : "text-muted-foreground"}`}>
                              {task.error_message || task.output_preview}
                            </p>
                          </ScrollArea>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
              {tasks.length > 0 && (
                <div className="mt-3 text-xs text-muted-foreground">
                  {completed} completed · {failed} failed · {tasks.length - completed - failed} pending
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {(synthesis || serverError) && (
          <Card className={status === "error" ? "border-red-500/40" : status === "interrupted" ? "border-amber-500/40" : "border-emerald-500/40"}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {status === "error" && <AlertTriangle className="h-4 w-4 text-red-400" />}
                {status === "interrupted" ? "Stopped" : status === "error" ? "Error" : "Synthesis"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {serverError ? (
                <div className="space-y-2">
                  <p className="text-sm">{serverError.user_message}</p>
                  {serverError.error_id && (
                    <p className="text-xs text-muted-foreground">ref: {serverError.error_id}</p>
                  )}
                </div>
              ) : (
                <ScrollArea className="max-h-96">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{synthesis}</p>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
