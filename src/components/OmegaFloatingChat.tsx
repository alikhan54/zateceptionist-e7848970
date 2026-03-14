import { useState, useRef, useEffect, useCallback } from "react";
import { Brain, Send, X, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { callWebhook, WEBHOOKS } from "@/lib/api/webhooks";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const AGENT_COLORS: Record<string, string> = {
  OMEGA: "text-violet-400",
  NOVA: "text-blue-400",
  PRISM: "text-emerald-400",
  ARIA: "text-pink-400",
  CORTEX: "text-orange-400",
  BEACON: "text-yellow-400",
  NEXUS: "text-slate-400",
  MEDICA: "text-teal-400",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  agent_used?: string;
  execution_time_ms?: number;
}

export function OmegaFloatingChat() {
  const { user, authUser, isAdmin } = useAuth();
  const { tenantId, tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
        // Auto-send after short delay so user sees what was transcribed
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

  // Text-to-speech for OMEGA responses
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

  // Keyboard shortcut: Ctrl+Shift+O
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "O") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, open]);

  const sendMessage = useCallback(async (overrideMsg?: string) => {
    const msg = (overrideMsg || input).trim();
    if (!msg || loading) return;
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setInput("");
    setLoading(true);
    try {
      const res = await callWebhook(WEBHOOKS.OMEGA_CHAT, {
        message: msg,
        channel: "web_chat",
        sender_identifier: user?.email || "",
        sender_type: isAdmin ? "admin" : "team_member",
        tenant_uuid: tenantUuid || "",
      }, tenantId || "zateceptionist");
      const data = res.data as any;
      if (res.success && data) {
        const responseText = data.response || data.message || data.error || "OMEGA returned an unexpected response. Please try again.";
        setMessages(prev => [...prev, {
          role: "assistant",
          content: responseText,
          agent_used: data.agent_used,
          execution_time_ms: data.execution_time_ms,
        }]);
        speakResponse(responseText);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "OMEGA is temporarily unavailable." }]);
      }
    } catch {
      toast({ title: "Error", description: "OMEGA is temporarily unavailable.", variant: "destructive" });
      setMessages(prev => [...prev, { role: "assistant", content: "OMEGA is temporarily unavailable." }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, user, tenantId, tenantUuid, toast, speakResponse]);

  const send = useCallback(() => sendMessage(), [sendMessage]);

  if (!user) return null;

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-violet-600 hover:bg-violet-500 text-white shadow-lg flex items-center justify-center transition-all hover:scale-110"
          title="Chat with OMEGA (Ctrl+Shift+O)"
        >
          <Brain className="h-6 w-6" />
          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-48px)] h-[500px] max-h-[calc(100vh-48px)] bg-background border border-violet-500/30 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-violet-500/5">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-violet-400" />
              <span className="font-semibold text-sm">OMEGA AI</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                title={voiceEnabled ? "Disable voice responses" : "Enable voice responses"}
              >
                {voiceEnabled ? <Volume2 className="h-3.5 w-3.5 text-violet-400" /> : <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea ref={scrollRef} className="flex-1 p-3">
            <div className="space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                  <Brain className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Ask OMEGA anything...</p>
                  {speechSupported && (
                    <p className="text-xs mt-1 opacity-60">or tap the mic to speak</p>
                  )}
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "bg-violet-600 text-white" : "bg-muted"}`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.agent_used && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`text-[10px] font-medium ${AGENT_COLORS[msg.agent_used?.toUpperCase()] || "text-muted-foreground"}`}>{msg.agent_used}</span>
                        {msg.execution_time_ms && <span className="text-[10px] text-muted-foreground">{msg.execution_time_ms}ms</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <Brain className="h-3.5 w-3.5 text-violet-400 animate-pulse" />
                      <span className="text-xs text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t p-3 flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder={isListening ? "Listening..." : "Ask OMEGA..."}
              disabled={loading || isListening}
              className="flex-1 h-9 text-sm"
            />
            {speechSupported && (
              <Button
                onClick={toggleVoice}
                disabled={loading}
                size="icon"
                variant={isListening ? "destructive" : "ghost"}
                className={`h-9 w-9 ${isListening ? "animate-pulse" : ""}`}
                title={isListening ? "Stop listening" : "Voice input"}
              >
                {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              </Button>
            )}
            <Button onClick={send} disabled={loading || !input.trim()} size="icon" className="h-9 w-9 bg-violet-600 hover:bg-violet-500">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
