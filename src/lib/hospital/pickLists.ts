// HOSPITAL-CHART [Brief 8 · C] — STATIC in-code convenience pick-lists for the Order-Entry
// type-ahead dropdowns. This is deliberately NOT a live formulary/catalog: no DB table, no
// query — a plain reference list so the doctor types less during a demo/consult. Free text
// is ALWAYS allowed (the input never blocks a custom entry); these are suggestions only.
// Clinical names/doses stay standard English in both UI languages (house i18n rule).

export interface PickItem {
  value: string;   // what gets put into the input when picked
  hint?: string;   // small secondary text in the suggestion row (class / category)
  price?: number;  // [Brief 11] indicative unit price (BDT) for the thin POS — in-code, NOT a catalog
}

/** Common cardiac medications with typical adult doses (suggestion text = ready order line). */
export const CARDIAC_MEDS: PickItem[] = [
  { value: "Aspirin 75mg OD", price: 3, hint: "antiplatelet" },
  { value: "Aspirin 300mg STAT", price: 5, hint: "antiplatelet · loading" },
  { value: "Clopidogrel 75mg OD", price: 14, hint: "antiplatelet" },
  { value: "Clopidogrel 300mg STAT", price: 40, hint: "antiplatelet · loading" },
  { value: "Ticagrelor 90mg BD", price: 55, hint: "antiplatelet" },
  { value: "Atorvastatin 40mg nocte", price: 18, hint: "statin" },
  { value: "Rosuvastatin 20mg nocte", price: 25, hint: "statin" },
  { value: "Metoprolol 25mg BD", price: 8, hint: "beta-blocker" },
  { value: "Bisoprolol 5mg OD", price: 10, hint: "beta-blocker" },
  { value: "Carvedilol 6.25mg BD", price: 12, hint: "beta-blocker" },
  { value: "Amlodipine 5mg OD", price: 6, hint: "calcium-channel blocker" },
  { value: "Diltiazem 30mg TDS", price: 9, hint: "calcium-channel blocker" },
  { value: "Ramipril 5mg OD", price: 12, hint: "ACE inhibitor" },
  { value: "Lisinopril 10mg OD", price: 10, hint: "ACE inhibitor" },
  { value: "Losartan 50mg OD", price: 9, hint: "ARB" },
  { value: "Valsartan 80mg OD", price: 20, hint: "ARB" },
  { value: "Furosemide 40mg OD", price: 4, hint: "loop diuretic" },
  { value: "Spironolactone 25mg OD", price: 7, hint: "K-sparing diuretic" },
  { value: "GTN 0.5mg SL PRN", price: 15, hint: "nitrate · anginal relief" },
  { value: "Isosorbide mononitrate 30mg OD", price: 11, hint: "nitrate" },
  { value: "Enoxaparin 60mg SC BD", price: 520, hint: "LMWH anticoagulant" },
  { value: "Heparin 5000U SC BD", price: 180, hint: "anticoagulant" },
  { value: "Warfarin 5mg OD", price: 8, hint: "anticoagulant · INR monitor" },
  { value: "Rivaroxaban 20mg OD", price: 95, hint: "DOAC" },
  { value: "Apixaban 5mg BD", price: 70, hint: "DOAC" },
  { value: "Digoxin 0.25mg OD", price: 5, hint: "inotrope · rate control" },
  { value: "Amiodarone 200mg OD", price: 22, hint: "antiarrhythmic" },
  { value: "Sacubitril/Valsartan 49/51mg BD", price: 120, hint: "heart failure (ARNI)" },
  { value: "Empagliflozin 10mg OD", price: 48, hint: "SGLT2i · heart failure" },
  { value: "Paracetamol 500mg QDS PRN", price: 2, hint: "analgesic" },
];

/** Standard blood / laboratory panels (suggestion text = the order line). */
export const LAB_PANELS: PickItem[] = [
  { value: "CBC (Complete Blood Count)", hint: "haematology" },
  { value: "Troponin I", hint: "cardiac marker" },
  { value: "Troponin T (hs)", hint: "cardiac marker" },
  { value: "CK-MB", hint: "cardiac marker" },
  { value: "NT-proBNP", hint: "heart failure marker" },
  { value: "Lipid profile (fasting)", hint: "biochemistry" },
  { value: "HbA1c", hint: "diabetes" },
  { value: "Fasting blood sugar", hint: "diabetes" },
  { value: "Random blood sugar (RBS)", hint: "diabetes" },
  { value: "Serum electrolytes (Na/K/Cl)", hint: "biochemistry" },
  { value: "Serum creatinine + eGFR", hint: "renal" },
  { value: "Urea / BUN", hint: "renal" },
  { value: "Liver function tests (LFT)", hint: "biochemistry" },
  { value: "Thyroid profile (TSH, FT4)", hint: "endocrine" },
  { value: "D-dimer", hint: "coagulation" },
  { value: "PT / INR", hint: "coagulation" },
  { value: "aPTT", hint: "coagulation" },
  { value: "CRP", hint: "inflammation" },
  { value: "ESR", hint: "inflammation" },
  { value: "Urinalysis (R/M/E)", hint: "urine" },
  { value: "Blood culture & sensitivity", hint: "microbiology" },
  { value: "Arterial blood gas (ABG)", hint: "critical care" },
  { value: "Serum magnesium", hint: "biochemistry" },
  { value: "Uric acid", hint: "biochemistry" },
];

// ============================================================================================
// [Brief 11] — thin-POS in-code reference pricing. Deliberately NOT a catalog table: indicative
// demo prices only (BDT); every price stays EDITABLE on the POS line. No discounts/tariffs/VAT.
// ============================================================================================

/** Static daily bed rates by ward/bed type (BDT/day) — the discharge bill's bed-days line. */
export const WARD_DAILY_RATES: Record<string, number> = {
  general: 2000,
  cardiac: 3500,
  icu: 8000,
  isolation: 5000,
};
export const DEFAULT_WARD_RATE = 2000;

/**
 * Indicative unit price for a free-text order/med line: exact pick-list match first, then a
 * drug-name (first-token) match. Unknown → null (the POS line starts at 0, manually priced).
 */
export function priceForMed(itemText: string): number | null {
  const t = (itemText || "").trim().toLowerCase();
  if (!t) return null;
  const exact = CARDIAC_MEDS.find((m) => m.value.toLowerCase() === t);
  if (exact?.price != null) return exact.price;
  const firstWord = t.split(/[\s(]/)[0];
  if (!firstWord) return null;
  const byName = CARDIAC_MEDS.find((m) => m.price != null && m.value.toLowerCase().split(/[\s(]/)[0] === firstWord);
  return byName?.price ?? null;
}

/** Standard cardiac diagnostics / imaging studies. */
export const IMAGING_STUDIES: PickItem[] = [
  { value: "ECG (12-lead)", hint: "cardiology" },
  { value: "Echocardiogram (2D echo + Doppler)", hint: "cardiology" },
  { value: "Chest X-ray (PA)", hint: "radiology" },
  { value: "CT coronary angiogram", hint: "radiology" },
  { value: "Coronary angiogram (cath lab)", hint: "interventional" },
  { value: "Cardiac MRI", hint: "radiology" },
  { value: "Exercise tolerance test (ETT)", hint: "cardiology" },
  { value: "Holter monitor (24h)", hint: "cardiology" },
  { value: "Carotid Doppler", hint: "vascular" },
  { value: "Ultrasound abdomen", hint: "radiology" },
  { value: "X-ray knee (AP + lateral)", hint: "orthopaedics" },
  { value: "MRI knee", hint: "orthopaedics" },
];
