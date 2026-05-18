# Cosmique — UI Audit & Empty-Data Root Cause

**Date:** 2026-05-18
**Tenant:** cosmique (UUID `933967dd-1f90-4676-96c1-42a01b6d9835`)
**Reported symptom:** `/clinic/treatments`, `/marketing/competitors`, and several other pages show empty data despite Phase 2 seeding (14 treatments, 3 competitors, 2 campaigns, 3 audience segments, 1 blog post, etc.) being verified in the database.

---

## Bottom line

The empty-data bug is **NOT a query-type mismatch** in the frontend code. The clinic_treatments and competitor_tracking page queries are already correct.

**Root cause: Row-Level Security (RLS) — there's no auth user in the `users` table mapped to `tenant_id='cosmique'`, and no master_admin RLS bypass on the affected tables.** Every authenticated query you make ends up filtered server-side by `tenant_id = get_user_tenant_id()`, which returns the LOGGED-IN user's tenant slug from `public.users.tenant_id`. The frontend "tenant switcher" (the `?tenant=cosmique` URL param) only updates localStorage — it does NOT change the JWT or the database session's tenant context. So when you tenant-switch to cosmique while logged in as a `master-zate` master_admin, the page asks for `clinic_treatments WHERE tenant_id='cosmique'`, but RLS rewrites that to `WHERE tenant_id='cosmique' AND tenant_id='master-zate'` — always zero rows.

---

## What I verified

### Database has the seeded data

| Table | tenant_id format | Rows for cosmique | Service-role query result |
|---|---|---:|---|
| `clinic_treatments` | SLUG (`'cosmique'`) | 14 | PASS, all `is_active=true` |
| `clinic_patients` | SLUG | 3 | PASS |
| `clinic_products` | SLUG | 3 | PASS |
| `competitor_tracking` | UUID (`'933967dd-…'`) | 3 | PASS (Kaya, Euromed, Biolite) |
| `marketing_campaigns` | UUID | 2 | PASS, both `status=draft` |
| `audience_segments` | UUID | 3 | PASS |
| `blog_posts` | UUID | 1 | PASS, `status=published` |
| `auto_lead_gen_settings` | UUID | 1 | PASS |
| `sequences` | SLUG | 3 | PASS (legacy hot/warm/cold) |
| `sales_leads` | SLUG | 2 | PASS |

Confirmed via service-role REST API. The data is real.

### Frontend hooks for the user-reported pages query correctly

| Page | Hook / file | Table | tenant_id value sent | DB expects | Verdict |
|---|---|---|---|---|---|
| `/clinic/treatments` | `useClinicTreatments.ts:36` | `clinic_treatments` | `tenantId` (slug) | SLUG | **CORRECT** |
| `/marketing/competitors` | `pages/marketing/CompetitorAnalysis.tsx:85` | `competitor_tracking` | `tenantConfig.id` (UUID) | UUID | **CORRECT** |
| `/marketing/campaigns` | `useMarketingCampaigns.ts:62` | `marketing_campaigns` | `tenantConfig.id` (UUID) | UUID | **CORRECT** |
| `/marketing/blog` | (BlogManager.tsx) | `blog_posts` | UUID | UUID | **CORRECT** |
| `/marketing/audience` | (audience hook) | `audience_segments` | UUID | UUID | **CORRECT** |
| `/sales/sequences` | (sequences hook) | `sequences` | SLUG | SLUG | **CORRECT** |

The pages the user reported are not the bug.

### Anon-key REST probe returns 0 rows for everything

Probing every table with the anon key (which is what the frontend uses pre-auth) returns 0 rows for every cosmique filter — confirming RLS is enabled and denying anonymous reads. So the user must be authenticated to see anything.

### RLS policies have NO master_admin bypass

Inspected `pg_policies` for the affected tables. The SELECT policies on `clinic_treatments`, `competitor_tracking`, `marketing_campaigns`, `audience_segments`, `blog_posts`, `sequences`, `sales_leads`, `customers`, `tenant_config` all check `tenant_id = get_user_tenant_id()` (or the UUID-equivalent helper). None of them have an `auth.uid() IN (SELECT user_id FROM user_roles WHERE role='master_admin')` clause. Only `tenant_config.SELECT` is permissive (`true`) — all authenticated users can read all tenant_configs. Every other table is strict.

```
clinic_treatments  SELECT  rls_tenant_read: tenant_id = get_user_tenant_id()
competitor_tracking SELECT rls_tenant_read: tenant_id = (SELECT tc.id FROM tenant_config tc WHERE tc.tenant_id = get_user_tenant_id())
marketing_campaigns SELECT rls_tenant_read: tenant_id = (SELECT tc.id FROM tenant_config tc WHERE tc.tenant_id = get_user_tenant_id())
audience_segments  SELECT  rls_tenant_read: tenant_id = (SELECT tc.id FROM tenant_config tc WHERE tc.tenant_id = get_user_tenant_id())
blog_posts         SELECT  rls_tenant_read: tenant_id = (SELECT tc.id FROM tenant_config tc WHERE tc.tenant_id = get_user_tenant_id())
                   SELECT  public_read_published: status = 'published'
sequences          ALL     Tenant isolation: auth.role()='service_role' OR tenant_id = get_user_tenant_id()
customers          ALL     Tenant isolation: auth.role()='service_role' OR tenant_id = get_user_tenant_id()
sales_leads        ALL     Tenant isolation: auth.role()='service_role' OR tenant_id = get_user_tenant_id()
tenant_config      SELECT  Authenticated can read config: true
```

### `get_user_tenant_id()` source

```sql
BEGIN
  IF current_setting('request.jwt.claims', true)::json->>'tenant_id' IS NOT NULL THEN
    RETURN current_setting('request.jwt.claims', true)::json->>'tenant_id';
  END IF;
  IF current_setting('app.tenant_id', true) IS NOT NULL
     AND current_setting('app.tenant_id', true) != '' THEN
    RETURN current_setting('app.tenant_id', true);
  END IF;
  RETURN (SELECT tenant_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1);
END;
```

Priority chain: JWT claim → app setting → users table lookup. The frontend's `?tenant=cosmique` switcher does **none of these** — it only sets `localStorage`. So the third priority wins: a lookup against `public.users.tenant_id WHERE auth_id = auth.uid()`.

### There is no cosmique-mapped auth user

```
public.users WHERE tenant_id IN ('cosmique', '933967dd-…')  →  0 rows
public.users WHERE email LIKE '%cosmique%'                  →  1 row
   cosmique@zatesystems.com  tenant_id='cosmique-df4dd00d'    ← mapped to DUPLICATE tenant
```

The only "cosmique-ish" auth user (`cosmique@zatesystems.com`) is mapped to the **duplicate** tenant `cosmique-df4dd00d` (UUID `eb22ebbc-…`). That tenant is the one the handover instructed to LEAVE ALONE. Logging in as `cosmique@zatesystems.com` would route every query to the duplicate tenant's (empty) data, not the seeded cosmique tenant's.

### Master admins exist but are NOT bypassed by RLS

| email | tenant_id | role |
|---|---|---|
| `zatesystems7@gmail.com` | `master-zate` | master_admin |
| `axeclaim@gmail.com` | `bobadook` | master_admin |

When either logs in, `get_user_tenant_id()` returns `master-zate` or `bobadook`. RLS filters all subsequent queries to those tenants. Master admin status grants no SELECT bypass under current RLS.

---

## Why Pulse / Phase 1 / Phase 1.6 / Phase 2 work in the UI

- **Pulse cathedral** (`/pulse` route): heavy reliance on aggregates and counts queries hit tables that either have permissive `public_read_*` policies (like `blog_posts.public_read_published`) OR have client-side fallbacks/computed values that hide the empty result (Phase 1.6 deliberately replaced zate-bleed placeholders with notConfigured markers).
- **Phase 1 + 1.6 verification** was done by the user as `master_admin` against THEIR OWN tenant (`master-zate`), then the page-level "Switch tenant" mechanism was assumed to show other tenants' data — but the only evidence the user has for cosmique-rendering is screenshots of the Pulse cathedral overlay, which uses aggregates that mostly resolve to zero for any cross-tenant view. The pages with rich data tables (`/clinic/treatments`, `/marketing/competitors`) genuinely cannot render cross-tenant rows.
- **DB seeding** (Phase 2 + Phase 2.10) used the service-role key, which bypasses RLS by design.

---

## What I fixed in this session anyway

Discovered three **separate, genuine** SLUG vs UUID bugs while auditing — not the cause of the user's reported symptom, but worth shipping:

| Commit | File | Bug |
|---|---|---|
| `f812438` | `src/hooks/useCustomers.ts` | Queried/inserted `customers` (UUID-keyed) with the slug `tenantId`. All customer reads/writes were silently invisible under RLS. |
| `f812438` | `src/hooks/useAnalytics.ts` | Dashboard customer-count queries used slug for UUID-keyed `customers` table. |
| `f812438` | `src/hooks/useInbox.ts` | Fallback-from-customers path used slug. Conversations path was already correct. |

All three changes additive (replaced `tenantId` with `tenantConfig?.id || tenantId` where appropriate, swapped variable to `tenantUuid` in useCustomers). `npx tsc --noEmit` PASS. One commit, three files.

---

## Recommended remediation paths for the user-reported bug

Listed in order of decreasing risk / increasing scope. The user should pick.

### Path A (smallest blast radius) — Re-map the cosmique auth user
Update `public.users.tenant_id` from `'cosmique-df4dd00d'` to `'cosmique'` for the row `cosmique@zatesystems.com`. Then ask user to log in as that account.

```sql
-- One row, one column, fully reversible
UPDATE public.users SET tenant_id = 'cosmique' WHERE email = 'cosmique@zatesystems.com';
```

- Pros: single UPDATE, no RLS policy changes, all data immediately visible.
- Cons: that user account is "owned" by Zate Systems, not the actual clinic owner. If the clinic owner later signs up, they get a different user.id and would need their OWN users.tenant_id set correctly.
- **NOT applied this session** — handover said "Duplicate tenant `cosmique-df4dd00d` — LEAVE ALONE" and this change would orphan the duplicate from its mapped user.

### Path B (medium blast radius) — Add master_admin RLS bypass
Add an `OR is_master_admin(auth.uid())` clause to every `rls_tenant_read` policy. Lets master_admins tenant-switch and see any tenant's data.

```sql
-- Example for clinic_treatments — repeat for all 30+ tables
DROP POLICY rls_tenant_read ON clinic_treatments;
CREATE POLICY rls_tenant_read ON clinic_treatments FOR SELECT
  USING (tenant_id = get_user_tenant_id()
      OR (SELECT role FROM user_roles WHERE user_id = (SELECT id FROM users WHERE auth_id = auth.uid())) = 'master_admin');
```

- Pros: master_admin can see all tenants without re-mapping users.
- Cons: ~30 tables. Risk if `is_master_admin` predicate is wrong (could leak data permanently). Should be wrapped in a SECURITY DEFINER function for clarity. Requires testing across all dashboards.

### Path C (largest blast radius) — JWT claim injection
Frontend's tenant-switcher emits a request header (e.g. `x-tenant-id`) that PostgREST forwards as a session-variable, and `get_user_tenant_id()`'s priority 2 (`app.tenant_id`) picks it up. Requires either a PostgREST configuration or a pre-request hook.

- Pros: surgical, addresses the design gap directly. Single source of truth for "which tenant is the master_admin currently viewing".
- Cons: requires changes to both PostgREST config AND frontend session interceptor. Larger initial setup but cleanest long-term.

### Path D (deferred for cosmique demo) — Create a dedicated cosmique user
Sign up a NEW auth user (e.g. `aumbar+cosmique@gmail.com`), insert into `public.users` with `tenant_id='cosmique'` and a non-master-admin role. Sign in as that user when demoing cosmique.

- Pros: zero schema or policy changes.
- Cons: requires user to sign up via the Lovable frontend, then have `users.tenant_id` UPDATEd to 'cosmique', then verify role is 'admin' or 'manager' (not 'staff' if you want full visibility).

---

## Why Playwright E2E was not run this session

The handover Part 3 required logging into the Lovable-published frontend as cosmique and asserting the page renders. Three blockers:

1. **No cosmique-mapped auth user** in the live DB. The only `cosmique@zatesystems.com` is mapped to the duplicate tenant.
2. **No credentials available** in `D:/420-system/frontend/.env.local` (file doesn't exist).
3. **Even with master_admin credentials, RLS would still block cosmique data** — so the test would deterministically fail. Running Playwright at this stage would produce noise, not signal.

After Path A or B is applied, Playwright would be valuable. Until then, manual verification: open the page logged in as `cosmique@zatesystems.com` (after Path A) OR as a master_admin (after Path B), confirm tables render. The recommended fix is Path A — single SQL UPDATE.

---

## Open questions the user should resolve

1. Is `cosmique@zatesystems.com` mapped to the duplicate `cosmique-df4dd00d` intentionally or by accident? If intentional, what's the purpose of the duplicate tenant?
2. Is the goal for cosmique to be browseable by `zatesystems7@gmail.com` (master_admin) directly, or only by a clinic-owner account?
3. Does any production workflow rely on master_admins being scoped to their own tenant (i.e., would Path B break anything)?
4. Should the entire `users.tenant_id` foreign-key model be refactored to a separate `user_tenant_access` many-to-many table so a single user can be a member of multiple tenants? (this would also solve T36 / multi-tenant VAPI cleanly)

The right next step is for the user to answer these — none of the recommended paths are zero-risk and the choice depends on their broader multi-tenant design intent.
