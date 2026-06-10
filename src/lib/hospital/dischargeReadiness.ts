// HOSPITAL-DISCHARGE — deterministic discharge-readiness. PURE function, NO LLM: each check is
// green / amber from the real record state. Amber NEVER blocks (the doctor can discharge on his own
// signature) — but the snapshot records every check's state at sign time. MEDICA only narrates this.
import type { News2Band, News2Trend } from "./news2";

export type ReadyState = "green" | "amber" | "na";
export interface ReadyCheck { key: string; state: ReadyState; detail: string; }

export interface ReadinessInput {
  ews?: { band: News2Band | null; trend: News2Trend | null } | null;  // active post-op episode (null = none)
  pendingTasks: number;                                                // hospital_nurse_tasks status=pending
  otCase?: { exists: boolean; opNoteSigned: boolean } | null;         // null/exists=false → no OT case
  rx?: { exists: boolean; signed: boolean } | null;                   // signed prescription
}

export function computeReadiness(input: ReadinessInput): { checks: ReadyCheck[]; allGreen: boolean } {
  const checks: ReadyCheck[] = [];

  // 1) early-warning: low band AND not deteriorating. No active episode → N/A (not a blocker).
  if (!input.ews) {
    checks.push({ key: "ews", state: "na", detail: "No active post-op episode" });
  } else {
    const ok = input.ews.band === "low" && input.ews.trend !== "deteriorating";
    checks.push({ key: "ews", state: ok ? "green" : "amber",
      detail: `EWS ${input.ews.band ?? "—"}${input.ews.trend ? `, ${input.ews.trend}` : ""}` });
  }

  // 2) no pending nurse tasks
  checks.push({ key: "tasks", state: input.pendingTasks === 0 ? "green" : "amber",
    detail: input.pendingTasks === 0 ? "All nursing tasks complete" : `${input.pendingTasks} pending task${input.pendingTasks === 1 ? "" : "s"}` });

  // 3) op note signed — only relevant if an OT case exists
  if (!input.otCase?.exists) {
    checks.push({ key: "opnote", state: "na", detail: "No operation on this admission" });
  } else {
    checks.push({ key: "opnote", state: input.otCase.opNoteSigned ? "green" : "amber",
      detail: input.otCase.opNoteSigned ? "Operative note signed" : "Operative note not signed" });
  }

  // 4) prescription signed — N/A if there's no Rx at all (nothing to reconcile)
  if (!input.rx?.exists) {
    checks.push({ key: "rx", state: "na", detail: "No prescription on file" });
  } else {
    checks.push({ key: "rx", state: input.rx.signed ? "green" : "amber",
      detail: input.rx.signed ? "Prescription signed" : "Prescription not signed" });
  }

  const allGreen = checks.every((c) => c.state !== "amber");
  return { checks, allGreen };
}
