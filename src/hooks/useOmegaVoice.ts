import { useState, useRef, useCallback, useEffect } from "react";
import { useTenant } from "@/contexts/TenantContext";

const WEBHOOK_BASE = "https://webhooks.zatesystems.com/webhook";

export function useOmegaVoice() {
  const { tenantConfig, tenantId } = useTenant();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Init speech recognition
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      setSpeechSupported(true);
      const recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = tenantConfig?.voice_language || "en-US";
      recognition.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        setTranscript(result[0].transcript);
        if (result.isFinal) setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, [tenantConfig?.voice_language]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      setTranscript("");
      try { recognitionRef.current.start(); setIsListening(true); } catch {}
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      setIsListening(false);
    }
  }, []);

  const speakText = useCallback(async (text: string) => {
    if (!voiceEnabled || !text) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsSpeaking(true);

    try {
      // Try Edge TTS via n8n proxy (natural voice)
      const resp = await fetch(`${WEBHOOK_BASE}/omega-tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.substring(0, 500).replace(/\*\*/g, "").replace(/\[.*?\]/g, ""),
          voice: tenantConfig?.voice_name || "en-US-ChristopherNeural",
          speed: tenantConfig?.voice_speed || "+0%",
          tenant_id: tenantId || "default",
        }),
      });
      const data = await resp.json();
      if (data.audio_url) {
        const audio = new Audio(data.audio_url);
        audioRef.current = audio;
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => { setIsSpeaking(false); fallbackBrowserTTS(text); };
        await audio.play();
        return;
      }
    } catch {}

    // Fallback: browser speechSynthesis
    fallbackBrowserTTS(text);
  }, [voiceEnabled, tenantConfig, tenantId]);

  const fallbackBrowserTTS = (text: string) => {
    if (!window.speechSynthesis) { setIsSpeaking(false); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.substring(0, 300));
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    isListening, isSpeaking, voiceEnabled, setVoiceEnabled,
    speechSupported, transcript, startListening, stopListening,
    speakText, stopSpeaking,
  };
}
