// HOSPITAL-POS [Brief 11 · C] — "Send to patient": posts the summary/receipt TEXT to the NEW
// additive n8n webhook `hospital-doc-delivery` (420 Hospital Doc Delivery v1.0). Channels:
//   • email — the platform's Hostinger SMTP (the Alert-Dispatcher transport)
//   • WhatsApp — the platform's Meta Cloud API number (the production comms transport).
//     FREEFORM messages deliver only inside an open 24h customer-initiated session — the patient
//     must have messaged the hospital's WhatsApp number within 24h (DEMO_PLAN §7 prerequisite).
// v1 carries TEXT (the printable papers remain the PDF path via the browser).
import { useEffect, useState } from "react";
import { Send, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useHospitalT } from "./i18n";

const WEBHOOK = "https://webhooks.zatesystems.com/webhook/hospital-doc-delivery";

export function SendDocControl({ defaultPhone, defaultEmail, subject, composeText, testid }: {
  defaultPhone?: string | null; defaultEmail?: string | null;
  subject: string; composeText: () => string; testid: string;
}) {
  const { t } = useHospitalT();
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<"email" | "whatsapp">("email");
  const [to, setTo] = useState(defaultEmail || "");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState("");
  useEffect(() => {
    setTo(channel === "email" ? (defaultEmail || "") : (defaultPhone || ""));
    setState("idle"); setErr("");
  }, [channel, defaultEmail, defaultPhone]);

  async function send() {
    if (!to.trim()) { setErr(t("send.needTo")); setState("error"); return; }
    setState("sending"); setErr("");
    try {
      const res = await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: "bsh-hospital", channel, to: to.trim(), subject, text: composeText() }),
      });
      const j = await res.json().catch(() => ({} as any));
      if (!res.ok || !j.ok) throw new Error(j.error || j.message || `HTTP ${res.status}`);
      setState("sent");
    } catch (e: any) {
      setErr(e?.message || t("common.tryAgain")); setState("error");
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5" data-testid={testid}>
      {!open ? (
        <button type="button" className="hx-btn hx-btn--ghost" style={{ padding: "0.22rem 0.55rem" }}
          onClick={() => setOpen(true)} data-testid={`${testid}-open`}>
          <Send className="h-3.5 w-3.5" /> {t("send.btn")}
        </button>
      ) : (
        <>
          <select className="hx-select" style={{ width: "auto" }} value={channel}
            onChange={(e) => setChannel(e.target.value as any)} data-testid={`${testid}-channel`}>
            <option value="email">{t("send.email")}</option>
            <option value="whatsapp">{t("send.whatsapp")}</option>
          </select>
          <input className="hx-input" style={{ width: 190 }} value={to} onChange={(e) => setTo(e.target.value)}
            placeholder={channel === "email" ? "name@email.com" : "+8801XXXXXXXXX"} data-testid={`${testid}-to`} />
          <button type="button" className="hx-btn hx-btn--primary" style={{ padding: "0.3rem 0.7rem" }}
            onClick={send} disabled={state === "sending"} data-testid={`${testid}-send`}>
            {state === "sending" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
          {state === "sent" && <span className="hx-chip hx-chip--ok" style={{ padding: "0 0.45rem" }} data-testid={`${testid}-sent`}><CheckCircle2 className="h-3 w-3" /> {t("send.sent")}</span>}
          {state === "error" && <span className="hx-chip hx-chip--warn" style={{ padding: "0 0.45rem" }} title={err} data-testid={`${testid}-error`}><AlertTriangle className="h-3 w-3" /> {t("send.fail")}</span>}
          {channel === "whatsapp" && <span className="hx-faint text-xs" data-testid={`${testid}-wa-note`}>{t("send.waNote")}</span>}
        </>
      )}
    </span>
  );
}
