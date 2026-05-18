# E2E Testing Rules — Permanent

**Owner:** any agent working on the 420 frontend.
**Established:** 2026-05-18, Phase 4a-FIX.
**Why:** Phase 4a declared "10 of 12 features PASS" based on screenshot review. The cosmique client immediately reported two broken workflows (Add Department, OMEGA chat). A subsequent action-level audit found **3 more** silent-failure bugs (Add Appointment, prescriptions schema mismatch, and the OMEGA hardcoded-demo trap itself). Screenshot-only "PASS" verdicts produce false confidence and harm the user. This rule exists so it never happens again.

---

## The 8-step PASS gate

A feature is "PASS" only if a test does **ALL** of:

1. **Navigate** to the route.
2. **Click** the primary action button (Add / Create / Submit / Approve).
3. **Fill** the form (if any) with valid data.
4. **Submit** the form (Enter, click, or programmatic event).
5. **Assert** the API call returned a `2xx` status code.
6. **Assert** the DB has the expected new row OR the expected mutation (use service-role REST or psql to check; the row must be visible to the tenant under RLS too).
7. **Assert** the UI reflects the new state (table grew by 1, modal closed, stat counter incremented, toast confirmation visible).
8. **Test at least one error path** — invalid input, network failure, or a known broken value — and confirm the UI shows a meaningful error (toast, inline field error, or banner), not a silent failure.

Anything less is one of these lesser verdicts — **never just "PASS"**:

| Verdict | Meaning |
|---|---|
| `VISUAL_ONLY_PASS` | Screenshot looks right; no action was tested. |
| `READ_PASS` | Page renders seeded data; no write path was exercised. |
| `BROKEN_UI` | Step 2 or 3 fails — button missing, form blocked. |
| `BROKEN_API` | Step 5 fails — request goes out but server 4xx/5xx. |
| `BROKEN_REFETCH` | Step 5 succeeds, Step 7 fails — write lands but UI doesn't update. |
| `BLOCKED_ON_DEPLOY` | Feature is in a pushed commit but not yet on the deployed build. |
| `N_A` | Feature isn't applicable to this tenant's industry. |

---

## How to do each step efficiently

**Two complementary methods.** Use both together; don't substitute one for the other.

### Method A — Playwright UI flow (slower, comprehensive)
1. `auth.setup.ts` logs in once and saves storageState (re-used across all probes).
2. Test file uses semantic locators: `page.getByRole('button', {name: /add patient/i})`, `page.getByLabel(/full name/i)`. **Never** generic `[role="row"]`.
3. Capture network responses via `page.on('response', r => ...)` to see the actual 4xx/5xx during the click.
4. Capture console errors via `page.on('console', m => ...)` for any frontend bug.
5. Take a full-page screenshot post-action for the report.
6. Run the assertions in step 5–8 of the PASS gate.

### Method B — Direct REST against the same JWT (faster, focused)
1. Reset the cosmique admin password via Admin API, sign in, capture the JWT.
2. For each suspect write path, POST the exact body shape the frontend would send.
3. Inspect the response. If you get a `22P02` (UUID syntax) or `23502` (NOT NULL) or `PGRST204` (column not found) error, **the frontend will fail the same way** — even if its screenshot looks fine.
4. Clean up the test row immediately so multi-tenant isolation is preserved.
5. Cross-check by reading the actual hook source: does the frontend really send what your test sent? Discrepancies are bugs.

Method B catches schema/RLS bugs faster than Method A. Method A catches UI bugs (modal won't open, toast doesn't fire) that Method B misses.

---

## Hard "do not declare PASS" red flags

If **any** of these are true at the end of a test run, the verdict cannot be "PASS":

- The user's reported workflow ("I can't add a department") wasn't exercised in code.
- The page shows seeded data but no `Add` button was clicked.
- The test runs but never asserts a 2xx OR never asserts the DB state.
- The frontend's INSERT/UPDATE body was assumed (not read from the actual hook source).
- The "Submit" handler is a `runDemoCycle()` or any handler that doesn't call a real API.
- A toast says "Failed" but the test code doesn't read the message and surface the root cause.
- Multi-tenant isolation wasn't re-verified after a write.
- The deployed bundle hash doesn't include the commit being verified.

---

## Discoveries this rule has saved us from (so far)

These were all surfaced by the action-level audit that Phase 4a's screenshot-only methodology missed:

| Bug | Symptom | Root cause | Where Phase 4a went wrong |
|---|---|---|---|
| Add Department fails | Toast "Failed to create department" | Form sent `manager_id: ""` to a UUID column → 22P02 | F2 patient-registration probe screenshot said "modal opens" — never clicked Submit |
| OMEGA always same response | Same demo line every time | `runDemoCycle` ignores input and types hardcoded `DEMO_TRANSCRIPT` | F10 Pulse cathedral probe screenshot looked beautiful — never typed a real question |
| Add Appointment fails | Toast "Failed to create" | INSERT missing legacy NOT NULL columns `appointment_date` + `start_time` → 23502 | F3 OPD probe never clicked "New Visit" + Submit |
| Prescriptions render undefined | Empty Care tab even when meds exist | Phase 3 interface declared `medication_name`/`dosage` columns that don't exist in `clinic_prescriptions` (real schema uses `medicines` jsonb) | Phase 3 never seeded a real row to test the read path |

These are NOT outlier bugs. They are the pattern that emerges when "PASS" is granted for screenshots instead of round-trips.

---

## Apply this rule from now on

- Every future Phase E2E spec must follow these 8 steps.
- The spec file naming convention: `cosmique-phase<N>-e2e.spec.ts` for UI flow, paired with a `phase<N>-action-audit.py` for the REST round-trips.
- Reports must include both the screenshot (visual proof) AND the REST verification (correctness proof).
- If a feature is BLOCKED_ON_DEPLOY, that is a fact about the deployment — not a feature verdict. Note it separately and re-test after deploy.
