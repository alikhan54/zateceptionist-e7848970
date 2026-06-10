// HOSPITAL-POSTOP — the post-op monitoring panel on the Patient Journey. Renders ONLY when the
// patient has an ACTIVE episode: the latest deterministic partial-NEWS2 score + band, the trend,
// a mini history, the driving vitals — and (Assisted mode, alert states only) a one-sentence
// MEDICA narrative explaining WHY, with the standard disclaimer. The score is math; MEDICA never
// changes it. Additive; reuses hx-* classes (light/dark + i18n automatic).
import { useEffect, useState } from "react";
import { Activity, Sparkles, Loader2, AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useHospitalT } from "./i18n";
import { useHospitalMode } from "./hospitalMode";
import { fetchEwsNarrative } from "./hospitalShared";
import { usePostopEpisode, isAlertState, type ScoreHistoryEntry } from "@/hooks/useHospitalPostop";
import { drivingParams, computeNews2 } from "@/lib/hospital/news2";

export function bandChipClass(band?: string | null) {
  return band === "high" ? "hx-chip--crit" : band === "medium" ? "hx-chip--warn" : "hx-chip--ok";
}

export function PostOpPanel({ patient }: { patient: any }) {
  const { t, ti, lang } = useHospitalT();
  const { isAssisted } = useHospitalMode();
  const patientId = patient?.id as string | undefined;
  const { data: episode } = usePostopEpisode(patientId);

  const [narrative, setNarrative] = useState("");
  const [narrState, setNarrState] = useState<"idle" | "loading" | "error">("idle");
  const [narrErr, setNarrErr] = useState("");
  useEffect(() => { setNarrative(""); setNarrState("idle"); setNarrErr(""); }, [patientId, episode?.updated_at]);

  if (!episode) return null;   // not a post-op patient → no panel (journey unchanged)

  const history: ScoreHistoryEntry[] = Array.isArray(episode.score_history) ? episode.score_history : [];
  const latest = history[history.length - 1] || null;
  const band = episode.latest_band;
  const trend = episode.trend;
  const alert = isAlertState(band, trend);
  // drivers come from the latest history entry's stored vitals (the same pure scorer — still no LLM)
  const drivers = latest ? drivingParams(computeNews2(latest.vitals)) : [];

  async function narrate() {
    if (!episode || !latest) return;
    setNarrState("loading"); setNarrErr("");
    try {
      const s = await fetchEwsNarrative({
        patientName: patient.full_name, patientId: patientId!,
        score: episode.latest_score ?? latest.score, band: band || latest.band, trend: trend || "stable",
        missing: episode.missing_params || latest.missing, checks: history.length,
        drivers: drivers.map((d) => ({ label: d.label, value: d.value, points: d.points })),
        lang,
      });
      setNarrative(s); setNarrState("idle");
    } catch (e: any) {
      setNarrErr(e?.message || t("medica.down")); setNarrState("error");
    }
  }

  const TrendIcon = trend === "deteriorating" ? TrendingUp : trend === "improving" ? TrendingDown : Minus;

  return (
    <div className="hx-panel hx-rise" style={{ animationDelay: "380ms" }} data-testid="hx-postop">
      <div className="hx-panel-h">
        <Activity className="h-4 w-4" style={{ color: "var(--hx-accent2)" }} />
        <span className="font-semibold">{t("postop.title")}</span>
        <span className={`hx-chip ${bandChipClass(band)}`} style={{ padding: "0.1rem 0.5rem" }} data-testid="hx-postop-band">
          {ti("postop.score", { n: episode.latest_score ?? "—" })} · {t(`postop.band.${band || "low"}`)}
        </span>
        <span className={`hx-chip ${trend === "deteriorating" ? "hx-chip--crit" : trend === "improving" ? "hx-chip--ok" : ""}`}
          style={{ padding: "0.1rem 0.5rem" }} data-testid="hx-postop-trend">
          <TrendIcon className="h-3 w-3" /> {t(`postop.trend.${trend || "stable"}`)}
        </span>
      </div>
      <div className="hx-panel-b space-y-2.5">
        <div className="hx-faint text-xs" data-testid="hx-postop-partial">
          {ti("postop.partial", { list: (episode.missing_params || []).join(", ") })}
        </div>

        {/* driving vitals (why the score is what it is — straight from the scorer) */}
        {drivers.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" data-testid="hx-postop-drivers">
            <span className="hx-label" style={{ margin: 0 }}>{t("postop.drivers")}</span>
            {drivers.map((d) => (
              <span key={d.key as string} className={`hx-chip ${d.points === 3 ? "hx-chip--crit" : d.points === 2 ? "hx-chip--warn" : ""}`}
                style={{ padding: "0.1rem 0.5rem" }} data-testid="hx-postop-driver">
                {d.label} {d.value} · {d.points}{t("postop.pts")}
              </span>
            ))}
          </div>
        )}

        {/* mini trend — the recent checks */}
        {history.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" data-testid="hx-postop-history">
            <span className="hx-label" style={{ margin: 0 }}>{ti("postop.history", { n: history.length })}</span>
            {history.slice(-6).map((h, i) => (
              <span key={`${h.at}-${i}`} className={`hx-chip ${bandChipClass(h.band)}`} style={{ padding: "0.05rem 0.45rem" }}
                title={new Date(h.at).toLocaleString()} data-testid="hx-postop-history-chip">{h.score}</span>
            ))}
          </div>
        )}

        {/* MEDICA narrative — Assisted-only, alert states only; narrates, never scores */}
        {isAssisted && alert && (
          <div className="space-y-2">
            <button type="button" className="hx-btn hx-btn--ghost" style={{ padding: "0.3rem 0.7rem" }}
              onClick={narrate} disabled={narrState === "loading"} data-testid="hx-postop-narrate">
              {narrState === "loading"
                ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("postop.narrating")}</>
                : <><Sparkles className="h-4 w-4" /> {t("postop.narrate")}</>}
            </button>
            {narrState === "error" && (
              <p className="hx-dim text-sm" data-testid="hx-postop-narr-error">
                {narrErr} <button className="underline" style={{ color: "var(--hx-accent)" }} onClick={narrate}>{t("medica.retry")}</button>
              </p>
            )}
            {narrative && (
              <div data-testid="hx-postop-narrative">
                <p className="text-sm" style={{ color: "var(--hx-strong)" }}>{narrative}</p>
                <span className="hx-chip hx-chip--warn mt-1" style={{ display: "inline-flex" }} data-testid="hx-postop-disclaimer">
                  <AlertTriangle className="h-3 w-3" /> {t("postop.disclaimer")}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
