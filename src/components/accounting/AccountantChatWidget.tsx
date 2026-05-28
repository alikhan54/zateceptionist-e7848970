import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Bot, User as UserIcon } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { callWebhook, WEBHOOKS } from "@/lib/api/webhooks";
import { sanitizeResponse } from "@/lib/security/sanitizeResponse";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  agentUsed?: string;
  durationMs?: number;
  timestamp: number;
}

interface AccountantChatWidgetProps {
  className?: string;
  heightClass?: string;
  initialSuggestions?: string[];
  greeting?: string;
}

const DEFAULT_SUGGESTIONS = [
  "Show me overdue invoices",
  "Which jobs are due this week?",
  "Summarise my client list",
  "Any reminders firing today?",
];

const DEFAULT_GREETING =
  "Hi — I'm your AI Accountant. Ask me about clients, jobs, invoices, reminders, or filing deadlines.";

export function AccountantChatWidget({
  className,
  heightClass = "h-[420px]",
  initialSuggestions = DEFAULT_SUGGESTIONS,
  greeting = DEFAULT_GREETING,
}: AccountantChatWidgetProps) {
  const { user, authUser, isAdmin } = useAuth();
  const { tenantId, tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const send = useCallback(
    async (raw: string) => {
      const message = raw.trim();
      if (!message || loading) return;
      if (!tenantId) {
        toast({
          title: "Not signed in",
          description: "Sign in to use the AI accountant.",
          variant: "destructive",
        });
        return;
      }

      const userMsg: ChatMessage = {
        role: "user",
        content: message,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const start = Date.now();
        const res = await callWebhook(
          WEBHOOKS.OMEGA_CHAT,
          {
            message,
            channel: "web_chat",
            sender_identifier: user?.email || authUser?.email || "smart-ledger-dashboard",
            sender_type: isAdmin ? "admin" : "team_member",
            tenant_uuid: tenantUuid || "",
            agent_preference: "accountant",
            surface: "smart-ledger-dashboard-widget",
          },
          tenantId,
        );
        const elapsed = Date.now() - start;
        const data = res.data as
          | { response?: string; message?: string; error?: string; agent_used?: string; execution_time_ms?: number }
          | undefined;

        if (res.success && data) {
          const text = data.response || data.message || "Sorry, I didn't get a response. Try rephrasing?";
          const safeText = sanitizeResponse(text);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: safeText,
              agentUsed: data.agent_used,
              durationMs: data.execution_time_ms ?? elapsed,
              timestamp: Date.now(),
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "I'm offline right now — try again in a moment, or contact support if this persists.",
              timestamp: Date.now(),
            },
          ]);
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Something went wrong reaching the AI. Try again in a moment.",
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, tenantId, tenantUuid, user, authUser, isAdmin, toast],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <Card className={className} data-testid="accountant-chat-widget">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          AI Accountant
          <Badge variant="outline" className="ml-1 text-[10px]">ACCOUNTANT · 12 tools</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className={`flex flex-col ${heightClass} p-3 pt-0`}>
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto pr-1 space-y-3"
          data-testid="chat-scroll"
        >
          {messages.length === 0 ? (
            <div className="text-center py-6 space-y-3" data-testid="chat-greeting">
              <Sparkles className="h-6 w-6 mx-auto text-primary/40" />
              <p className="text-sm text-muted-foreground">{greeting}</p>
              <div className="flex flex-wrap gap-2 justify-center pt-2" data-testid="chat-suggestions">
                {initialSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    disabled={loading}
                    className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-muted/40 transition-colors"
                    data-testid={`suggestion-${s.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={`${m.timestamp}-${i}`}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`chat-msg-${m.role}-${i}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 opacity-70">
                    {m.role === "user" ? (
                      <UserIcon className="h-3 w-3" />
                    ) : (
                      <Bot className="h-3 w-3" />
                    )}
                    <span className="text-[10px] uppercase tracking-wide">
                      {m.role === "user" ? "You" : m.agentUsed ?? "AI"}
                    </span>
                    {m.durationMs ? (
                      <span className="text-[10px] opacity-70">{Math.round(m.durationMs / 100) / 10}s</span>
                    ) : null}
                  </div>
                  {m.content}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start" data-testid="chat-loading">
              <div className="bg-muted rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Bot className="h-3.5 w-3.5 text-primary animate-pulse" />
                  <span>Thinking…</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2" data-testid="chat-form">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about clients, jobs, invoices…"
            disabled={loading}
            data-testid="chat-input"
            className="flex-1"
            aria-label="Ask the AI Accountant"
          />
          <Button type="submit" disabled={loading || !input.trim()} size="icon" data-testid="chat-send">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
