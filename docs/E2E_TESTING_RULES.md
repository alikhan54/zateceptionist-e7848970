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

---

## Test infrastructure conventions (hardened in Phase 5d)

Phase 5d's strict "Method A only — UI click drives every PASS verdict" mandate forced three rounds of surgical hardening before all 4 specs ran 4/4 REAL_PASS in serial. The patterns below are now the **starting baseline** for new specs — start here, don't re-discover.

### 1. Replace fixed `waitForTimeout(N)` after navigation with `waitForSelector` on real content
Pages with React-Query-driven data take 5–10s to populate under cold cache. A 2.5s sleep then a 5s `isVisible` budget will flake on the slow path. Anchor on a testid attached to the first row of the grid:
```ts
await page.goto('/clinic/products', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-testid^="product-card-"]', { timeout: 20_000 }).catch(()=>{});
await page.waitForTimeout(500); // tiny buffer for layout
```

### 2. UI assertions after mutations: use `expect.poll`, not single-shot `innerText`
React Query's `invalidateQueries` + refetch lands 1–3s **after** the mutation success toast. A single `expect(text).toContain(newValue)` fired at t+500ms catches the stale DOM and fails. Poll the value:
```ts
await expect.poll(
  async () => await page.getByTestId(`product-stock-${id}`).innerText(),
  { timeout: 10_000, intervals: [500, 500, 1000] },
).toContain(String(newStock));
```

### 3. `waitUntil: 'networkidle'` hangs on dashboards with continuous polling
The OMEGA `/dashboard` route polls indefinitely (omega-autonomous, pulse data). `networkidle` waits for 500ms of zero requests — which never happens. Default to `domcontentloaded` + an explicit `waitForSelector` on a sentinel element:
```ts
page.setDefaultNavigationTimeout(60_000);
await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 60_000 });
await page.waitForSelector('.v3-input-pill', { timeout: 25_000 });
```

### 4. Use `page.keyboard.type({delay})` + in-input Enter; avoid `input.fill()` + external click
`input.fill('x')` updates the DOM value synchronously but React `setState` from `onChange` may not have committed by the time you click an external submit button — the button's onClick closure reads the **previous** inputValue. Two safe patterns:
- (preferred) Type char-by-char with `keyboard.type(s, { delay: 25 })` then `keyboard.press('Enter')` inside the focused input (onKeyDown reads latest closure).
- Or, if you must click an external button, `await expect(input).toHaveValue(text)` first to wait for the value to land, then click.

### 5. Detect transient renders with a MutationObserver, not polling-based `isVisible`
For an element that's only mounted while `state === 'thinking'` (a few hundred ms in the warm-cache case), `isVisible({timeout: 15000})` polling every 80ms can miss the entire window. Install an observer BEFORE the submit:
```ts
await page.evaluate(() => {
  (window as any).__seen = false;
  const obs = new MutationObserver(() => {
    if (document.querySelector('[data-testid="omega-progress-hint"]')) (window as any).__seen = true;
  });
  obs.observe(document.body, { childList: true, subtree: true });
});
await submitButton.click();
await page.waitForTimeout(15_000); // through the listening → thinking → speaking cycle
const seen = await page.evaluate(() => (window as any).__seen);
```

### 6. Test data hygiene: seed via REST, drive verdict via UI, clean up in the test
For UI tests that need a row to click, **seed via REST** in the test body (fast, deterministic) and **always include cleanup** in the same test. Multi-tenant gate runs after the suite catches any leak. Use a `TEST_CC_PHASE<N>_` prefix so a grep can spot leftover rows:
```ts
const seeded = await sbFetch('/rest/v1/clinic_consultations', { method: 'POST', body: ... });
const id = seeded.data[0].id;
try { /* click stuff */ } finally {
  await sbFetch(`/rest/v1/clinic_consultations?id=eq.${id}`, { method: 'DELETE' });
}
```

### 7. Reverts MUST happen even when a test fails mid-flight
J13 (treatment price edit) updates a real Cosmique price (Botox AED 1800). If the test fails between the UPDATE and the revert PATCH, the real catalog is corrupted. Two options:
- Wrap the mutation+assertion+revert in `try/finally` so revert always runs.
- After the suite, run a baseline scan (`SELECT name, price FROM clinic_treatments WHERE tenant_id='cosmique'`) and revert any drift before declaring REAL_PASS.

### 8. `DEPLOY_PENDING` is a valid verdict — never downgrade to "Method B PASS"
If the deployed Lovable bundle doesn't yet contain the new testid, the test cannot produce a PASS verdict for that feature. The spec must:
1. Detect via `await page.waitForSelector(testid).catch(()=>{})` + `isVisible({timeout: 8s})`.
2. Record `DEPLOY_PENDING` to the results JSON.
3. Call `test.skip(true, 'DEPLOY_PENDING')` so Playwright marks it as skipped, not failed.
4. **Do NOT** fall back to a REST PATCH and call it PASS. The whole point of Method A is that the UI click drove the change.

### 9. Webhook delay races: route-mock or MutationObserver, never just longer waits
For tests verifying transient UX states tied to an external HTTP call (OMEGA "thinking" while LangGraph runs), neither `page.route(/url/, async r => { await sleep(); await r.continue(); })` nor a longer `isVisible` timeout is reliable on its own. The route-mock can fail to intercept cross-origin requests; the longer timeout still races a warm-cache reply. Combine MutationObserver (pattern 5) for the transient element with a stub on the real webhook only when you need deterministic state windows.

These nine are **starting equipment**, not Phase-5d-specific. Every new spec uses them.
