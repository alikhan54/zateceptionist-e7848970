# HR E2E — Round 5: False-Success Toast Bug

**Tenant**: zateceptionist (UUID `ac308ab6-f381-4eef-88ec-4d5c7a860ff9`)
**Date**: 2026-05-23
**Production bundle**: `assets/index-ahawwjOO.js` (commit `7e3a2b3`)

```
╔══════════════════════════════════════════════════════════════════╗
║   THE BUG: "I added an employee, success message, but no row"   ║
╠══════════════════════════════════════════════════════════════════╣

ROOT CAUSE: callWebhook never throws
  • src/lib/api/webhooks.ts:196-245 wraps fetch failures into a
    resolved value: { success: false, error: "…" }
  • The n8n employee-onboarding webhook returns HTTP 200 + body
    { success: false, error: "first_name and last_name required" }
    when its validation rejects the payload
  • useHR.createEmployee.mutationFn did `return callWebhook(...)` —
    a resolved value (even with success=false) makes TanStack Query
    treat the mutation as successful
  • Result: "Employee added successfully" toast + query invalidation
    + refetch → list refreshes but NO new row exists → user is lost

WHERE IT BREAKS
  Insert tenant_id format:   UUID  (correct)
  Select tenant_id format:   UUID  (correct)
  RLS policy:                tenant_id match (UUID)
  Format mismatch:           NO  (this was NOT the bug)
  The bug is the success-resolution semantic in callWebhook + mutation.

EVIDENCE
  • DB query: latest hr_employees row for zate UUID is 2026-03-27
    (the last LEGITIMATE create was 7+ weeks before this report)
  • curl POST /webhook/hr/employee-onboarding-v2 with empty payload:
    HTTP 200, body {"success":false,"error":"first_name and last_name required"}
  • That EXACT response would have been swallowed pre-fix.

FIX APPLIED
  src/lib/api/webhooks.ts:
    + export async function callWebhookOrThrow<T>(endpoint, data, tenantId)
      Promotes BOTH failure layers to thrown Errors:
        1) HTTP layer: callWebhook returned { success: false }
        2) App layer:  HTTP 200 with body { success: false, error/message }
                       (n8n's validation-failure pattern)

  src/hooks/useHR.ts:
    Switched 7 mutationFns from callWebhook → callWebhookOrThrow:
      • createEmployee, updateEmployee, terminateEmployee
      • checkIn, checkOut
      • requestLeave, approveLeave
    Enhanced 2 onError handlers to show the actual webhook error message:
      • createEmployee:  "Failed to add employee: <message>"
      • requestLeave:    "Failed to submit leave: <message>"

VERIFICATION
  Local Vite build (with fix applied):
    A — Valid create:                      ✅ row appears in list
    B — Forced webhook { success: false }: ✅ ERROR toast, no false success
    Round 2 (page loads):                  ✅ 18/18 PASS, 0 errors
    Round 3 (interactives):                ✅ 8/8 WORKING
    AskAI nav (10 HR pages):               ✅ 10/10 nav
    Total local:                           38/38 PASS

  Live production (after deploy of 7e3a2b3 → bundle index-ahawwjOO.js):
    Full suite:                            ✅ 40/40 PASS in 13.7 min
      • hr-e2e-round2:        18/18 (PASS, 0 net/cons/EB errors)
      • hr-e2e-round3:        8/8  WORKING
      • hr-askai-nav:         10/10 navigated
      • hr-create-employee-bug: 2/2 (A row appears, B error toast fires)

TypeScript:  ✅ npx tsc --noEmit -p tsconfig.app.json (only pre-existing errors)
Build:       ✅ npx vite build (54s, no errors)
Cleanup:     3 + 1 + 1 rows deleted; 0 residual PLAYWRIGHT/PW* rows
Baselines:   hr_employees=21  leave_requests=9  jobs=6  agents=0
╚══════════════════════════════════════════════════════════════════╝
```

## Investigation trail

1. **Database check** — Queried `hr_employees` directly via service-role:
   - 31 total rows; 21 for zate UUID, 8 for cosmique UUID, 2 for small tenants
   - ALL rows use the UUID tenant_id format consistently → no format mismatch
   - Latest zate row created 2026-03-27 (~7 weeks before this bug report)
   - Conclusion: user submits are NOT landing in DB, despite "success" toast.

2. **Frontend code review** — Read `useEmployees`/`createEmployee`:
   ```ts
   // hooks/useHR.ts:212-243
   const tenantUuid = tenantConfig?.id;   // UUID — correct
   .from("hr_employees").select("*").eq("tenant_id", tenantUuid)  // UUID query
   // createEmployee mutation:
   mutationFn: async (employeeData) => {
     return callWebhook(WEBHOOKS.EMPLOYEE_ONBOARDING, employeeData, tenantUuid);
   }
   onSuccess: () => { toast.success("Employee added successfully"); … }
   onError:   () => toast.error("Failed to add employee"),
   ```
   - Query and webhook both use UUID — match.
   - But `callWebhook` returns `{ success: false }` on failure, never throws.
   - `mutationFn` returns that value, so onSuccess fires anyway.

3. **Webhook layer** — Read `lib/api/webhooks.ts:196-245`:
   - On `!response.ok`: `return { success: false, error: "…" }` (no throw)
   - On 2xx: `return { success: true, data: responseData }`
   - But for an n8n workflow that returns `200 OK` with body
     `{ success: false }`, callWebhook reports `{ success: true, data: { success: false, … } }`
   - Both paths still resolve. **The mutation never sees a rejection.**

4. **Live curl probe** confirmed the failure mode:
   ```
   POST /webhook/hr/employee-onboarding-v2 with {tenant_id only}
   → HTTP 200
   → {"success":false,"error":"first_name and last_name required"}
   ```
   This is the smoking gun — production n8n returns this for any input
   that omits required fields, and the frontend has been treating it as
   a success since the feature was built.

## The fix (minimal + additive)

### src/lib/api/webhooks.ts — new helper

```ts
export async function callWebhookOrThrow<T = unknown>(
  endpoint, data, tenantId,
): Promise<WebhookResponse<T>> {
  const result = await callWebhook<T>(endpoint, data, tenantId);
  if (!result.success) throw new Error(result.error || `Webhook ${endpoint} failed`);
  const body = result.data as { success?: boolean; error?: string; message?: string };
  if (body && typeof body === 'object' && body.success === false) {
    throw new Error(body.message || body.error || `Webhook ${endpoint} reported failure`);
  }
  return result;
}
```

`callWebhook` itself is UNCHANGED — query call sites that inspect the
return value (e.g. `sendMessage` in HR AI assistant) keep working.

### src/hooks/useHR.ts — 7 mutationFns swapped

All seven HR mutations that hit n8n webhooks now use the new helper:

| Mutation | Before | After |
|---|---|---|
| `createEmployee` | `return callWebhook(…)` | `return callWebhookOrThrow(…)` |
| `updateEmployee` | `return callWebhook(…)` | `return callWebhookOrThrow(…)` |
| `terminateEmployee` | `return callWebhook(…)` | `return callWebhookOrThrow(…)` |
| `checkIn` | `return callWebhook(…)` | `return callWebhookOrThrow(…)` |
| `checkOut` | `return callWebhook(…)` | `return callWebhookOrThrow(…)` |
| `requestLeave` | `return callWebhook(…)` | `return callWebhookOrThrow(…)` |
| `approveLeave` | `return callWebhook(…)` | `return callWebhookOrThrow(…)` |

### Error message surface — 2 onError handlers improved

```ts
// Before
onError: () => toast.error("Failed to add employee"),
// After
onError: (e: any) => toast.error(`Failed to add employee: ${e?.message || 'unknown error'}`),
```

Applied to `createEmployee` and `requestLeave`. Users now see the
actual webhook error (e.g. "first_name and last_name required") instead
of a generic "Failed".

## Proof spec

`tests/hr-create-employee-bug.spec.ts` (new, 2 tests):

- **Test A** (positive) — Fill the 6-step wizard with valid data, submit.
  Webhook returns `success: true`. Expect employee in list. **PASS**.
- **Test B** (negative) — `page.route.fulfill` intercepts the webhook
  endpoint and forces a 200 response with body
  `{ success: false, error: "MISSING_FIELDS", message: "first_name and
  last_name required (forced by test)" }`. Fill the form, submit.
  Expect NO "Employee added successfully" toast (would have appeared
  pre-fix). Expect the error toast with the message. **PASS**.

Both tests pass against the live production deployment of
commit `7e3a2b3`.

## Files changed

```
src/lib/api/webhooks.ts                   +31 -0   + callWebhookOrThrow helper
src/hooks/useHR.ts                        +12 -10  swap 7 mutations + 2 toast msgs
tests/hr-create-employee-bug.spec.ts     (NEW)    174 lines, 2 tests
playwright.config.ts                       +9 -0   + hr-create-employee-bug project
```

## Cumulative rounds

| Round | Bugs fixed | Tests added | Live pass rate |
|---|---|---|---|
| Round 1 | (cosmique near-empty audit) | hr-e2e-verification | 18 pages |
| Round 2 | 5 (department_name, FK embed, Docs crash, Shifts 404, AI selector) | hr-e2e-round2-zate | 18/18 |
| Round 3 | 1 (leave employee_id) | hr-e2e-round3-interactive | 8/8 |
| Round 4 | 1 (AskAIButton stub) + 5 affordances added | hr-askai-navigation | 10/10 |
| **Round 5** | **1 (false-success toast in 7 mutations)** | **hr-create-employee-bug** | **2/2** |

**Live HR section status after Round 5: 40/40 affordances PASS on
`ai.zatesystems.com`.** The bug the user reported is fixed — submitting
the Add Employee form with valid data now actually creates the employee,
and submitting with invalid data shows a clear error toast naming what
went wrong.

## Safety + hygiene

- 0 n8n workflow changes (per rule)
- 0 database schema changes (per rule)
- 0 credentials touched (per rule)
- `tsc` + `vite build` clean (per rule)
- Test data cleaned: 3+1+1 rows deleted; 0 residual `PLAYWRIGHT*` rows
- Baselines restored: 21/9/6/0

## What the user will see now

**Before**: "Employee added successfully" toast on every submit. Then
silence. No row in list. No KPI bump on dashboard. Confusion.

**After**: 
- Valid submit → "Employee added successfully" toast + row in list + KPI bumps. ✅
- Invalid submit → "Failed to add employee: first_name and last_name required" toast. Clear next action. ✅
