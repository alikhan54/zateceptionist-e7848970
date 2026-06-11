// HOSPITAL-CHART [Brief 8 · C] — STATIC in-code convenience pick-lists for the Order-Entry
// type-ahead dropdowns. This is deliberately NOT a live formulary/catalog: no DB table, no
// query — a plain reference list so the doctor types less during a demo/consult. Free text
// is ALWAYS allowed (the input never blocks a custom entry); these are suggestions only.
// Clinical names/doses stay standard English in both UI languages (house i18n rule).

export interface PickItem {
  value: string;   // what gets put into the input when picked
  hint?: string;   // small secondary text in the suggestion row (class / category)
}

/** Common cardiac medications with typical adult doses (suggestion text = ready order line). */
export const CARDIAC_MEDS: PickItem[] = [
  { value: "Aspirin 75mg OD", hint: "antiplatelet" },
  { value: "Aspirin 300mg STAT", hint: "antiplatelet · loading" },
  { value: "Clopidogrel 75mg OD", hint: "antiplatelet" },
  { value: "Clopidogrel 300mg STAT", hint: "antiplatelet · loading" },
  { value: "Ticagrelor 90mg BD", hint: "antiplatelet" },
  { value: "Atorvastatin 40mg nocte", hint: "statin" },
  { value: "Rosuvastatin 20mg nocte", hint: "statin" },
  { value: "Metoprolol 25mg BD", hint: "beta-blocker" },
  { value: "Bisoprolol 5mg OD", hint: "beta-blocker" },
  { value: "Carvedilol 6.25mg BD", hint: "beta-blocker" },
  { value: "Amlodipine 5mg OD", hint: "calcium-channel blocker" },
  { value: "Diltiazem 30mg TDS", hint: "calcium-channel blocker" },
  { value: "Ramipril 5mg OD", hint: "ACE inhibitor" },
  { value: "Lisinopril 10mg OD", hint: "ACE inhibitor" },
  { value: "Losartan 50mg OD", hint: "ARB" },
  { value: "Valsartan 80mg OD", hint: "ARB" },
  { value: "Furosemide 40mg OD", hint: "loop diuretic" },
  { value: "Spironolactone 25mg OD", hint: "K-sparing diuretic" },
  { value: "GTN 0.5mg SL PRN", hint: "nitrate · anginal relief" },
  { value: "Isosorbide mononitrate 30mg OD", hint: "nitrate" },
  { value: "Enoxaparin 60mg SC BD", hint: "LMWH anticoagulant" },
  { value: "Heparin 5000U SC BD", hint: "anticoagulant" },
  { value: "Warfarin 5mg OD", hint: "anticoagulant · INR monitor" },
  { value: "Rivaroxaban 20mg OD", hint: "DOAC" },
  { value: "Apixaban 5mg BD", hint: "DOAC" },
  { value: "Digoxin 0.25mg OD", hint: "inotrope · rate control" },
  { value: "Amiodarone 200mg OD", hint: "antiarrhythmic" },
  { value: "Sacubitril/Valsartan 49/51mg BD", hint: "heart failure (ARNI)" },
  { value: "Empagliflozin 10mg OD", hint: "SGLT2i · heart failure" },
  { value: "Paracetamol 500mg QDS PRN", hint: "analgesic" },
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
