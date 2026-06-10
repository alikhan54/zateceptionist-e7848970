// HOSPITAL-POSTOP — deterministic partial-NEWS2 early-warning scorer. PURE MATH, NO LLM, no I/O.
// Scores the 5 NEWS2 parameters the hospital actually captures (respiratory rate, SpO₂ [scale 1],
// temperature, systolic BP, heart rate). Consciousness (ACVPU) and supplemental-O₂ are NOT captured
// by the vitals flow, so every result is labelled a PARTIAL NEWS2 — `missing` lists what wasn't
// scored (uncaptured parameters can only make the true score HIGHER, never lower).
//
// Banding follows the standard NEWS2 thresholds:
//   total 0–4 → low · total 5–6 → medium · total ≥7 → high
//   PLUS the standard single-parameter escalation: ANY single parameter scoring 3 raises a
//   low total to medium (the NEWS2 "red score" urgent-review rule).
//
// MEDICA never touches this — it only narrates the already-computed result (DEMO_PLAN §5d).

export interface News2Input {
  respiratory_rate?: number | null;
  spo2?: number | null;
  temperature?: number | null;
  blood_pressure_systolic?: number | null;
  heart_rate?: number | null;
}

export type News2Band = "low" | "medium" | "high";
export type News2Trend = "improving" | "stable" | "deteriorating";

export interface News2Param { key: keyof News2Input; label: string; value: number; points: 0 | 1 | 2 | 3; }
export interface News2Result {
  score: number;
  band: News2Band;
  partial: boolean;            // always true while ACVPU + supplemental-O₂ aren't captured
  missing: string[];           // parameter labels NOT scored (uncaptured or not in this entry)
  params: News2Param[];        // every scored parameter with its points (drives the "why")
  redFlag: boolean;            // any single parameter scored 3 (the escalation rule)
}

const has = (v: number | null | undefined): v is number => typeof v === "number" && isFinite(v);

// Standard NEWS2 per-parameter points (SpO₂ scale 1; no hypercapnic scale 2 — not captured).
export function rrPoints(v: number): 0 | 1 | 2 | 3 { return v <= 8 ? 3 : v <= 11 ? 1 : v <= 20 ? 0 : v <= 24 ? 2 : 3; }
export function spo2Points(v: number): 0 | 1 | 2 | 3 { return v <= 91 ? 3 : v <= 93 ? 2 : v <= 95 ? 1 : 0; }
export function tempPoints(v: number): 0 | 1 | 2 | 3 { return v <= 35.0 ? 3 : v <= 36.0 ? 1 : v <= 38.0 ? 0 : v <= 39.0 ? 1 : 2; }
export function sbpPoints(v: number): 0 | 1 | 2 | 3 { return v <= 90 ? 3 : v <= 100 ? 2 : v <= 110 ? 1 : v <= 219 ? 0 : 3; }
export function hrPoints(v: number): 0 | 1 | 2 | 3 { return v <= 40 ? 3 : v <= 50 ? 1 : v <= 90 ? 0 : v <= 110 ? 1 : v <= 130 ? 2 : 3; }

const SCORERS: { key: keyof News2Input; label: string; fn: (v: number) => 0 | 1 | 2 | 3 }[] = [
  { key: "respiratory_rate", label: "Respiratory rate", fn: rrPoints },
  { key: "spo2", label: "SpO2", fn: spo2Points },
  { key: "temperature", label: "Temperature", fn: tempPoints },
  { key: "blood_pressure_systolic", label: "Systolic BP", fn: sbpPoints },
  { key: "heart_rate", label: "Heart rate", fn: hrPoints },
];

// Parameters NEWS2 defines that this deployment does not capture — always reported missing.
export const UNCAPTURED_PARAMS = ["Consciousness (ACVPU)", "Supplemental O2"];

export function computeNews2(input: News2Input): News2Result {
  const params: News2Param[] = [];
  const missing: string[] = [];
  let score = 0;
  let redFlag = false;
  for (const s of SCORERS) {
    const v = input[s.key];
    if (!has(v)) { missing.push(s.label); continue; }
    const pts = s.fn(v);
    params.push({ key: s.key, label: s.label, value: v, points: pts });
    score += pts;
    if (pts === 3) redFlag = true;
  }
  missing.push(...UNCAPTURED_PARAMS);
  let band: News2Band = score >= 7 ? "high" : score >= 5 ? "medium" : "low";
  if (band === "low" && redFlag) band = "medium";   // single-parameter-3 escalation
  return { score, band, partial: true, missing, params, redFlag };
}

/** Trend = the latest total vs the immediately previous one (deterministic + explainable). */
export function computeTrend(history: { score: number }[]): News2Trend {
  if (history.length < 2) return "stable";
  const latest = history[history.length - 1].score;
  const prev = history[history.length - 2].score;
  return latest > prev ? "deteriorating" : latest < prev ? "improving" : "stable";
}

/** The parameters driving the score (points desc), for the chips + the MEDICA narrative input. */
export function drivingParams(r: News2Result, max = 3): News2Param[] {
  return [...r.params].filter((p) => p.points > 0).sort((a, b) => b.points - a.points).slice(0, max);
}
