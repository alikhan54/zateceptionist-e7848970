# BSH-HMS Phase 3 — Frontend Architecture

> **Status:** DESIGN / implementation spec for the hospital-facing UI. Nothing in this doc is
> built yet — Phase 3 is the *next* build. Every file path and pattern below was **verified
> against the real checkout** (`D:/420-system/repo`, branch `feature/bsh-hms-phase2-gaps`) so
> the plan is concrete and additive, not hypothetical.
>
> **Verification labels:** `[VERIFIED-CODE]` = read from the actual source this session;
> `[DESIGN]` = proposed, not yet built.

---

## 0. Grounding correction (read this first)

CLAUDE.md §22 cites `frontend/src/App.tsx`. **In this git checkout there is no `frontend/`
directory** — the React/Vite app lives at the **repo root**: `src/App.tsx`, `src/components/`,
`src/pages/`, `src/contexts/`, `src/layouts/`. `[VERIFIED-CODE]` The `frontend/` prefix in
CLAUDE.md refers to the separate non-git working folder. **All paths below are repo-root
relative** (`src/...`). The repo is the React/Lovable app *and* carries `services/`,
`supabase/`, `bahmni-config/`, `bsh-intelligence-owa/` alongside it.

---

## 1. How the existing industry gating actually works `[VERIFIED-CODE]`

The frontend already gates 9 verticals by industry; BSH-HMS must mirror this exactly.

**Source of truth:** `src/contexts/TenantContext.tsx`
- `IndustryType` union (line 4) enumerates every supported industry. **It does NOT yet include
  `healthcare_hospital`.**
- Industry booleans derived ~lines 662–674, e.g.
  ```ts
  const isHealthcareClinic = industry === "healthcare_clinic" || industry === "healthcare";
  const isConstructionEstimation = industry === "construction_estimation" || (industry as string) === "construction";
  const isAccountingPracticeUK = industry === "accounting_practice_uk";
  ```
- Each boolean is added to the context interface (~line 457–462) and exported in the provider
  value (~line 705).

**Consumers:**
- `src/components/NavigationSidebar.tsx` (the **live** sidebar — confirmed imported by
  `src/components/Layout.tsx`; `AppSidebar.tsx` is dead) destructures the flags
  (line 159) and renders one conditional `{isX && (<Section/>)}` block per vertical
  (Collections ~1005, Clinic ~1010, Estimation ~1015, Roofing ~1020, Accounting ~1025,
  YouTube ~1030, Real Estate ~1035, Tenders ~1045).
- `src/App.tsx` declares routes as `lazy()` imports + `<Route … element={<LazyPage><Page/></LazyPage>}/>`
  wrapped by `ProtectedRoute` (`src/components/auth/ProtectedRoute.tsx`, auth only — industry
  gating is enforced by the sidebar not rendering the entry, plus page-level `useTenant` guards).
- Smart-Ledger precedent (sidebar line 596) shows gating can be **industry + a `features` flag**
  (`industry=accounting_practice_uk + features.accountant_dept`) — the same pattern BSH can use
  if hospital sub-modules need finer control.

---

## 2. Additive changes to add the `/hospital/*` vertical `[DESIGN]`

All additive — no existing vertical, route, or sacred file is modified.

### 2.1 TenantContext — add the industry
1. `IndustryType` union (line 4): append `| "healthcare_hospital"`.
2. After line 674 add:
   ```ts
   const isHealthcareHospital = industry === "healthcare_hospital";
   ```
3. Context interface (~462): add `isHealthcareHospital: boolean;`
4. Provider value (~705): add `isHealthcareHospital,`

> Note: keep `isHealthcareClinic` **distinct** — do NOT fold `healthcare_hospital` into the
> clinic boolean, or hospital tenants would inherit clinic nav and vice-versa.

### 2.2 NavigationSidebar — new gated section
Add one block mirroring the Clinic section, gated by `isHealthcareHospital`:
```tsx
{/* Hospital Section — healthcare_hospital industry only (BSH-HMS) */}
{isHealthcareHospital && (
  <SidebarSection title={translate("Hospital")}>
    <Item to="/hospital/dashboard"     icon={Activity}   label="Command Center" />
    <Item to="/hospital/opd"           icon={Stethoscope} label="OPD Reception" />
    <Item to="/hospital/beds"          icon={BedDouble}  label="Bed Occupancy" />
    <Item to="/hospital/lab"           icon={FlaskConical} label="Lab & Critical Alerts" />
    <Item to="/hospital/branches"      icon={Building2}  label="Multi-Branch Metrics" />
    <Item to="/hospital/corporate"     icon={Briefcase}  label="Corporate Billing" />
    <Item to="/hospital/operations"    icon={Layout}     label="Operations (OWA)" />
  </SidebarSection>
)}
```

### 2.3 App.tsx — lazy pages + routes
Add lazy imports beside the clinic block (~line 146) and a `{/* Hospital Module */}` route group
beside the clinic routes (~1250):
```tsx
const HospitalDashboard = lazy(() => import("./pages/hospital/Dashboard"));
const HospitalOPD        = lazy(() => import("./pages/hospital/OPDReception"));
const HospitalBeds       = lazy(() => import("./pages/hospital/BedOccupancy"));
const HospitalLab        = lazy(() => import("./pages/hospital/LabAlerts"));
const HospitalBranches   = lazy(() => import("./pages/hospital/BranchMetrics"));
const HospitalCorporate  = lazy(() => import("./pages/hospital/CorporateBilling"));
const HospitalOperations = lazy(() => import("./pages/hospital/OperationsOWA"));
```
```tsx
{/* Hospital Module — healthcare_hospital industry only */}
<Route path="/hospital" element={<Navigate to="/hospital/dashboard" replace />} />
<Route path="/hospital/dashboard"  element={<LazyPage><HospitalDashboard /></LazyPage>} />
<Route path="/hospital/opd"        element={<LazyPage><HospitalOPD /></LazyPage>} />
<Route path="/hospital/beds"       element={<LazyPage><HospitalBeds /></LazyPage>} />
<Route path="/hospital/lab"        element={<LazyPage><HospitalLab /></LazyPage>} />
<Route path="/hospital/branches"   element={<LazyPage><HospitalBranches /></LazyPage>} />
<Route path="/hospital/corporate"  element={<LazyPage><HospitalCorporate /></LazyPage>} />
<Route path="/hospital/operations" element={<LazyPage><HospitalOperations /></LazyPage>} />
```
Create `src/pages/hospital/` with the 7 page components. Each page calls `useTenant()` and
**hard-redirects if `!isHealthcareHospital`** (defense in depth — the sidebar already hides the
link, but a hand-typed URL must not render hospital UI for a non-hospital tenant). This mirrors
the existing per-page guard convention.

---

## 3. Frontend ↔ Bahmni data flow `[DESIGN, services VERIFIED-CODE]`

The hospital pages never talk to Bahmni directly. They talk to the **3 FastAPI services already
in `services/`** (verified present: `bsh-auth-bridge/`, `bsh-multi-branch-aggregator/`,
`bsh-vapi-handler/`) and to Supabase, which is the same `@/integrations/supabase` client every
other page uses.

```
React (/hospital/*)
   │
   ├── Supabase REST (existing client)
   │     • bsh_multibranch_metrics   (migration 37 — branch KPIs)
   │     • bsh_clinical_log          (migration 39 — AI augmentation audit)
   │     • tenant_config / hospital_tenants view (migration 38)
   │       → all gated by RLS + the healthcare_hospital DB triggers (Section 1)
   │
   ├── bsh-auth-bridge        (FastAPI) → mints/relays Bahmni session for the tenant
   ├── bsh-multi-branch-aggregator (FastAPI) → cross-branch rollups for /hospital/branches
   └── bsh-vapi-handler       (FastAPI) → voice OPD (see BSH_VAPI_ASSISTANT_CONFIG.md)
        │
        └── Bahmni REST / FHIR (OpenMRS + OpenELIS + Odoo) — patients, encounters, labs, beds
```

- **Auth:** browser → `bsh-auth-bridge` (never embeds Bahmni admin creds in the SPA). The bridge
  reads the tenant's `features.bahmni_secret_ref` (`vault:bsh-demo`) to fetch the real secret —
  the SPA only ever holds a short-lived scoped token.
- **PHI boundary:** Supabase tables store **references** (`patient_ref`, `encounter_ref`), not raw
  PHI — full clinical records stay in Bahmni. The frontend renders PHI only via the bridge,
  per-request, so PHI is never persisted in the 420 Supabase project. (See `BSH_BAHMNI_HARDENING.md`.)
- **Industry gate, 6 layers:** sidebar hide → page redirect → service middleware → Supabase RLS →
  Supabase trigger → OWA browser guard. The frontend owns the first two.

---

## 4. OmegaFloatingChat extension `[DESIGN, behavior VERIFIED-CODE]`

`src/components/OmegaFloatingChat.tsx` already renders a tenant-gated FAB site-wide
(`if (!tenantId) return null;`) and is **intentionally suppressed on `/dashboard`** via
`body.omega-fullscreen [title="Chat with OMEGA …"] { display:none }` (CLAUDE.md §22B).

For BSH, **no structural change is required** — the FAB already appears on `/hospital/*`.
Optional additive enhancement: when `isHealthcareHospital`, seed hospital-specific quick-prompts
("Bed occupancy now?", "Critical labs today?", "No-show risk this week?") that POST to the
existing `/webhook/omega-chat` proxy (→ LangGraph OMEGA, which already firewalls by tenant).
Keep the existing behavior for every other industry untouched (guard the quick-prompts behind
`isHealthcareHospital`).

---

## 5. OWA (Operations Web App) iframe embedding `[VERIFIED-CODE present, DESIGN embed]`

`bsh-intelligence-owa/` is a standalone OpenMRS-style operations app (verified files:
`index.html`, `manifest.webapp`, `scripts/app.js`, `scripts/controllers/dashboard.js`,
`scripts/services/industry-guard.js`, `scripts/services/zate-api.js`, `styles/zate-theme.css`).
It already ships its own **browser-side industry guard** (`industry-guard.js`) — layer 6 of the gate.

**Embedding at `/hospital/operations`:**
- Render `OperationsOWA.tsx` as a full-height `<iframe>` pointing at the OWA origin (served by
  Bahmni/Apache, exposed via the `bsh-aggregator`/OWA Cloudflare hostname — see
  `BSH_CLOUDFLARE_TUNNEL_SETUP.md`). Do **not** inline the OWA into the SPA bundle.
- **Sandbox** the iframe: `sandbox="allow-scripts allow-same-origin allow-forms"`, and set a CSP
  `frame-src` allowlist limited to the OWA hostname. Pass the scoped token via `postMessage`
  after an origin check — never via query string (avoids token leak in logs/referrer).
- The page still runs the `!isHealthcareHospital` redirect before mounting the iframe, so the OWA
  is double-gated (SPA guard + OWA's own `industry-guard.js`).

---

## 6. Theming `[DESIGN]`

Reuse the existing theming convention: brand colors with no schema column live in
`tenant_config.features` as `brand_<role>_color` (CLAUDE.md §6), and the FE reads non-standard
colors from `features`. BSH's palette therefore needs **no schema change** — set
`features.brand_primary_color` etc. on the `bsh-demo` row. The OWA has its own `zate-theme.css`.

---

## 7. Effort estimate `[DESIGN — estimate, not measured]`

| Day | Work |
|---|---|
| 1 | TenantContext + sidebar + App.tsx wiring; `/hospital/dashboard` shell; per-page industry guard. |
| 2 | `bsh-auth-bridge` session flow from the SPA; Supabase reads for `bsh_multibranch_metrics`; Branch Metrics + Bed Occupancy pages. |
| 3 | OPD Reception + Lab/Critical Alerts pages (read `bsh_clinical_log` + bridge→Bahmni labs). |
| 4 | Corporate Billing page; OWA iframe embed + sandbox/CSP + postMessage token handoff. |
| 5 | OMEGA hospital quick-prompts; theming; empty/loading/error states; i18n (Bengali strings in `src/locales`). |
| 6–7 | Cross-tenant regression (a clinic + a non-hospital tenant must see **zero** hospital UI), responsive/dark-mode, Playwright specs, buffer. |

**4–7 days** for one frontend engineer. **This is an estimate, not a measurement.** Risks that
push toward 7: Bahmni REST/FHIR field-mapping surprises, OWA cross-origin/CSP friction, and
Bengali RTL/format edge cases.

---

## 8. Hard guardrails for whoever builds this

- **Additive only.** New files under `src/pages/hospital/` + the 4 small edits in §2. Touch **no**
  other vertical's routes/pages and **no** sacred frontend file.
- **Never fold `healthcare_hospital` into `isHealthcareClinic`** — they are different products.
- **No PHI in Supabase.** Store refs; render PHI via the bridge per-request.
- **Double-gate every hospital surface** (sidebar hide + page redirect) and verify a
  `healthcare_clinic` tenant (e.g. cosmique) sees no `/hospital/*` entry and gets redirected if
  they hand-type the URL.
- **Verify in a browser before claiming done** (preview workflow) — type checks ≠ feature checks.
