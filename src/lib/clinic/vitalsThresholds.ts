// Clinic vitals: field metadata + warning/critical threshold logic.
// CONTRACT for clinic_vitals_config (jsonb columns):
//   warning_alert_rule  = { "min": <number>, "max": <number> }  (normal band; outside => warning)
//   critical_alert_rule = { "min": <number>, "max": <number> }  (danger band; outside => critical)
//   matched to a vital by clinic_vitals_config.vital_name === VitalField.key
// When a tenant has no config row for a vital, the built-in DEFAULT_THRESHOLDS apply.
// (Two-tier warning/critical is a 420 design — the source app only had a single hardcoded
//  {min,max} visual band; defaults below mirror those numbers as the WARNING band.)

export type VitalKind = "number" | "text";

export interface VitalField {
  key: string;        // == clinic_visits column AND clinic_vitals_config.vital_name
  label: string;
  unit: string;
  kind: VitalKind;
  required?: boolean;
  step?: string;
}

// The 15 floor vitals — keys map 1:1 to clinic_visits columns [VERIFIED-DB Phase 1].
export const VITAL_FIELDS: VitalField[] = [
  { key: "temperature", label: "Temperature", unit: "°C", kind: "number", required: true, step: "0.1" },
  { key: "heart_rate", label: "Pulse", unit: "bpm", kind: "number", required: true },
  { key: "blood_pressure_systolic", label: "BP Systolic", unit: "mmHg", kind: "number", required: true },
  { key: "blood_pressure_diastolic", label: "BP Diastolic", unit: "mmHg", kind: "number", required: true },
  { key: "spo2", label: "SpO₂", unit: "%", kind: "number", required: true },
  { key: "respiratory_rate", label: "Respiratory Rate", unit: "/min", kind: "number" },
  { key: "height_cm", label: "Height", unit: "cm", kind: "number", step: "0.1" },
  { key: "weight_kg", label: "Weight", unit: "kg", kind: "number", step: "0.1" },
  { key: "sugar", label: "Blood Sugar", unit: "mg/dL", kind: "number", step: "0.1" },
  { key: "hip_cm", label: "Hip", unit: "cm", kind: "number", step: "0.1" },
  { key: "waist_cm", label: "Waist", unit: "cm", kind: "number", step: "0.1" },
  { key: "head_circumference_cm", label: "Head Circ.", unit: "cm", kind: "number", step: "0.1" },
  { key: "urinalysis", label: "Urinalysis", unit: "", kind: "text" },
  { key: "lmp", label: "LMP", unit: "", kind: "text" },
  { key: "other_details", label: "Other Details", unit: "", kind: "text" },
];

export interface Band { min: number; max: number; }
export interface Thresholds { warn?: Band; crit?: Band; }
export type VitalStatus = "normal" | "warning" | "critical" | "empty";

// Built-in defaults. warn = source app's VITAL_RANGES; crit = clinically-wider danger band.
export const DEFAULT_THRESHOLDS: Record<string, Thresholds> = {
  temperature: { warn: { min: 36.1, max: 37.2 }, crit: { min: 35.0, max: 39.0 } },
  heart_rate: { warn: { min: 60, max: 100 }, crit: { min: 40, max: 130 } },
  blood_pressure_systolic: { warn: { min: 90, max: 140 }, crit: { min: 70, max: 180 } },
  blood_pressure_diastolic: { warn: { min: 60, max: 90 }, crit: { min: 40, max: 120 } },
  spo2: { warn: { min: 95, max: 100 }, crit: { min: 90, max: 100 } },
  respiratory_rate: { warn: { min: 12, max: 20 }, crit: { min: 8, max: 30 } },
  sugar: { warn: { min: 70, max: 140 }, crit: { min: 54, max: 250 } },
};

interface VitalsConfigRow {
  vital_name: string;
  warning_alert_rule: Band | null;
  critical_alert_rule: Band | null;
}

// Merge tenant config rows over the defaults → key -> Thresholds.
export function buildThresholdMap(config: VitalsConfigRow[] | undefined): Record<string, Thresholds> {
  const map: Record<string, Thresholds> = { ...DEFAULT_THRESHOLDS };
  for (const row of config || []) {
    if (!row?.vital_name) continue;
    const warn = row.warning_alert_rule && typeof row.warning_alert_rule.min === "number"
      ? row.warning_alert_rule : map[row.vital_name]?.warn;
    const crit = row.critical_alert_rule && typeof row.critical_alert_rule.min === "number"
      ? row.critical_alert_rule : map[row.vital_name]?.crit;
    map[row.vital_name] = { warn, crit };
  }
  return map;
}

function outside(b: Band | undefined, v: number): boolean {
  return !!b && (v < b.min || v > b.max);
}

// Classify a single reading against its thresholds.
export function classifyVital(key: string, raw: unknown, thresholds: Record<string, Thresholds>): VitalStatus {
  if (raw === null || raw === undefined || raw === "") return "empty";
  const v = typeof raw === "number" ? raw : parseFloat(String(raw));
  if (Number.isNaN(v)) return "empty";
  const t = thresholds[key];
  if (!t) return "normal";
  if (outside(t.crit, v)) return "critical";
  if (outside(t.warn, v)) return "warning";
  return "normal";
}

// Summarize a visit's vitals -> the worst status + the offending fields.
export function summarizeVitals(
  values: Record<string, unknown>,
  thresholds: Record<string, Thresholds>,
): { worst: VitalStatus; warnings: string[]; criticals: string[] } {
  const warnings: string[] = [];
  const criticals: string[] = [];
  for (const f of VITAL_FIELDS) {
    if (f.kind !== "number") continue;
    const s = classifyVital(f.key, values[f.key], thresholds);
    if (s === "critical") criticals.push(f.label);
    else if (s === "warning") warnings.push(f.label);
  }
  const worst: VitalStatus = criticals.length ? "critical" : warnings.length ? "warning" : "normal";
  return { worst, warnings, criticals };
}
