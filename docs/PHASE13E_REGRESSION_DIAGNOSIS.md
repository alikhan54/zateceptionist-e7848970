# Phase 13.E — Regression Diagnosis: Admin Users Render as Staff

**Date:** 2026-05-24
**Reporter:** adeel@zatesystems.com seeing minimal "Staff" sidebar on zate tenant after recent commits.
**Diagnosis type:** Read-only forensic analysis. Zero writes this session.

---

## Root cause (definitive)

The bug is a **DATA STATE** issue, not a code regression. Specifically: 5 user_ids now have DUPLICATE rows in `public.user_roles`, and the frontend's `.maybeSingle()` query errors when it sees >1 row, defaulting the user to `'staff'` role.

### Mechanism

**`src/contexts/AuthContext.tsx:145-155`** (pre-existing, untouched by any recent commit):
```tsx
const { data: roleData, error: roleError } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userData.id)
  .maybeSingle();              // ← errors when multiple rows match

if (roleError) {
  console.error('[AuthContext] Error fetching user role:', roleError);
  // ← error caught but not rethrown
}

const userRole = (roleData?.role as UserRole) || 'staff';  // ← defaults to 'staff'
```

When `user_id` matches 2 rows, PostgREST returns `406 Not Acceptable` ("JSON object requested, multiple (or no) rows returned"). Supabase's `.maybeSingle()` surfaces this as an error and returns `null` for `data`. The error is logged but not surfaced to the UI. `roleData` is null, `userRole = undefined || 'staff'` = `'staff'`.

### `NavigationSidebar.tsx` reaction (also pre-existing, sacred, untouched)

Line 985-989:
```tsx
{authUser?.role === "staff" && <StaticSection section={staffSection} />}
{authUser?.role !== "staff" && <CollapsibleSection section={mainSection} sectionKey="main" />}
```

Plus `canAccessSection()` at lines 270-307 returns `false` for staff users without explicit `staffPermissions` — which gates SALES AI, MARKETING AI, HR AI, OPERATIONS, etc. behind admin/manager role checks.

So `authUser.role = 'staff'` → user sees only:
- "My Work" StaticSection (My Tasks / Inbox / Calendar / Customers / Services)
- COMMUNICATIONS (allowed for staff)
- OMEGA (no role gate)
- SETTINGS (allowed for staff)

**Exactly what adeel reported.**

---

## What introduced the duplicates

**Commit `8a9f8c5` — author KHURRAM ALI, 2026-05-24 16:10:18 +0500:**

> `feat(settings): per-page role gates via universal user_roles source`
>
> "Concurrent backfill (committed to DB pre-deploy): 6 onboarded tenants (zateceptionist, master-zate, marhama-group, rewerck-roofing were the 4 with users rows; aamerah + zk-realestate had 0 users) had no user_roles rows. Backfilled from public.users.role inside transaction with post-count assertion."

This is the **Session B (Cosmique Settings Audit)** commit per `CC_SESSION_COORDINATION.md`.

The backfill claim was "6 onboarded tenants had no user_roles rows" — but **5 user_ids already had user_roles rows** (created on 2026-01-07/08 and 2026-04-21). The backfill blindly INSERTed a second row with `tenant_id` populated, instead of UPDATEing the existing tenant_id=NULL row or skipping the insert when a row already existed.

The commit also did NOT touch `NavigationSidebar.tsx` or `AuthContext.tsx`. The role-filtering in NavigationSidebar.tsx (lines 270-307 + 985-989) is pre-existing — it just never had a user wrongly tagged as 'staff' before the duplicate.

---

## Blast radius

**5 user_ids have duplicate `user_roles` rows.** All 5 were INSERTed by the 2026-05-24 backfill alongside pre-existing rows:

| User email | Tenant | `users.role` | Pre-backfill row | Post-backfill row | Current UI |
|---|---|---|---|---|---|
| **adeel@zatesystems.com** | zateceptionist | admin | admin (NULL, 2026-01-08) | admin (zateceptionist, 2026-05-24) | renders as Staff ❌ |
| **zatesystems7@gmail.com** | master-zate | admin | master_admin (NULL, 2026-01-07) | admin (master-zate, 2026-05-24) | renders as Staff ❌ |
| **marhama1991@gmail.com** | marhama-group | admin | admin (NULL, 2026-01-07) | admin (marhama-group, 2026-05-24) | renders as Staff ❌ |
| **admin@rewerck-roofing.zatesystems.com** | rewerck-roofing | admin | admin (admin-aeba8a66, 2026-04-21) | admin (rewerck-roofing, 2026-05-24) | renders as Staff ❌ |
| asra@marhamagroup.com | marhama-group | staff | staff (NULL, 2026-01-07) | staff (marhama-group, 2026-05-24) | renders as Staff ✓ (no change — already staff) |

**4 admin/master_admin users across 4 tenants are blocked from accessing 90% of the app.**

`public.users` duplicate rows (separate but related — pre-existing issue, NOT caused by Session B):
- `adeel@zatesystems.com` has TWO `public.users` rows (`4c60c257-…` admin from 2026-01-07; `16228725-…` staff from 2026-01-16). The auth flow uses `4c60c257-…` (proven by `user_roles` having matching `user_id`). The staff duplicate is unused-but-present.

---

## Severity

🔴 **HIGH / DEMO-BLOCKING**

- 4 admin-level users locked out of admin features across 4 production tenants
- Includes `adeel@zatesystems.com` — the founder, currently demonstrating
- Bug surfaced today via Bangladesh demo prep

---

## Proposed fixes (3 options)

### Option A — Data fix (RECOMMENDED)

Delete the 5 duplicate rows that the 2026-05-24 backfill inserted, keeping the pre-existing rows.

**Why these particular rows are the correct ones to delete:**
- They were inserted today, post-deploy of the Settings audit
- The pre-existing rows (months old, `tenant_id=NULL`) were the canonical ones the auth path was designed around
- AuthContext's query doesn't filter by `tenant_id`, so keeping the NULL-tenant ones doesn't break role resolution
- Removes the `.maybeSingle()` error path without code change

**Exact SQL (data-only, no DDL):**
```sql
-- 5 deletions, each by exact row id from the 2026-05-24 backfill
DELETE FROM public.user_roles WHERE user_id='4c60c257-fdfb-447e-bdee-98809356b7fe' AND tenant_id='zateceptionist';
DELETE FROM public.user_roles WHERE user_id='750c2f0a-1819-…' AND tenant_id='master-zate';
DELETE FROM public.user_roles WHERE user_id='8abb4623-15cc-…' AND tenant_id='marhama-group';
DELETE FROM public.user_roles WHERE user_id='92a7cc42-a10e-…' AND tenant_id='marhama-group';
DELETE FROM public.user_roles WHERE user_id='5ad1f826-d1e1-…' AND tenant_id='rewerck-roofing';
```

Pros:
- Instant fix (< 1 sec via Studio or REST DELETE)
- Pure data; no code change; no Lovable rebuild needed
- Reversible — full row IDs documented; can re-insert if needed
- Doesn't touch the new tenant-scoped `user_roles.tenant_id` column Session B introduced

Cons:
- Doesn't address the underlying `.maybeSingle()` brittleness — same bug can recur if future code paths INSERT user_roles without checking for existence

**Risk:** very low. The 5 deleted rows are byte-identical to their surviving twins (same `user_id`, same `role`). Only difference is `tenant_id` column (NULL vs populated). If Session B's Settings page-gate code later requires tenant_id-populated rows specifically, those users would re-break — but the AuthContext layer would still work.

### Option B — Code fix in AuthContext.tsx

Change `.maybeSingle()` to a multi-row tolerant query:

```diff
- const { data: roleData, error: roleError } = await supabase
+ const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.id)
-   .maybeSingle();
+   .order('created_at', { ascending: false })
+   .limit(1)
+   .maybeSingle();
```

Pros:
- Defensive — prevents future duplicates from causing the same bug
- Preserves both user_roles rows (some future code may need them)
- Predictable: always picks the most recent row

Cons:
- Picks the SESSION B row (newer) for the 5 users. For `master-zate`'s `zatesystems7@gmail.com`, that means losing `master_admin` (newer row says just `admin`). Could downgrade a master admin to admin → loses Master Admin section access.
- AuthContext.tsx is NOT in the sacred list per `COSMIQUE_STATUS.md` "DO NOT TOUCH" but it's foundational across all tenants — should still be treated with extra care.

**Risk:** medium-high specifically for `zatesystems7@gmail.com` master-zate user (master_admin → admin downgrade).

### Option C — Both A + B (defense in depth)

Apply Option A first (instant fix for affected 4 users), then Option B (prevent recurrence).

**Risk:** lowest cumulative. Highest effort (two changes).

---

## Recommended path

**Option A.** Reasons:
1. Fastest fix (DELETE 5 rows)
2. Pure data — no Lovable rebuild needed
3. Doesn't risk the `zatesystems7@gmail.com` master_admin downgrade that Option B would cause
4. Pre-existing rows are the canonical ones the auth path was built around (NULL tenant_id pattern, used since January)
5. Reversible — full row IDs preserved in this report

Follow up later with **Option B** (defensive code change) as a separate small commit, but only after confirming the master_admin case won't downgrade. Option B is best applied with an explicit role-priority sort:
```sql
.order('role', { ascending: false })  -- 'staff' < 'manager' < 'admin' < 'master_admin' alphabetically reversed
.limit(1)
```
Or pick the row matching the user's `auth.jwt() user_metadata.tenant_id`.

---

## Session ownership

This is **Session B (Cosmique Settings Audit)** territory:
- `src/lib/settings-permissions.ts` — Session B's
- `src/pages/settings/*.tsx` (8 pages now with role gates) — Session B's
- `public.user_roles` backfill — Session B's data operation

Session A (Cosmique Mobile, this session) is read-only on this. Fix should be Session B's to apply, OR a coordinated session decided by the user.

Per coordination doc: "Each section has explicit scope (read+write), read-only, MUST NOT TOUCH lists." `user_roles` writes belong to Session B's data scope.

---

## Forensic evidence

### `public.users` for adeel:
```
4c60c257-fdfb-447e-bdee-98809356b7fe | admin | 2026-01-07 (canonical, used by auth)
16228725-af1a-4f81-9296-bd363f78efb8 | staff | 2026-01-16 (duplicate, unused — separate pre-existing issue)
```

### `public.user_roles` for adeel's admin user_id:
```
e09d7fe9-967b-41e0-9edc-8d3f0efe3ff1 | role=admin | tenant_id=NULL          | 2026-01-08
3cc347cb-cddb-4ac5-8879-6687f25e155e | role=admin | tenant_id=zateceptionist | 2026-05-24  ← Session B backfill
```

### Recent commits scanned (last 36h, sidebar/auth/role relevant):
- `7d07603` Phase 13.C — Session A. No role logic.
- `7429565` Phase 13.A — Session A. No role logic.
- `8a9f8c5` Settings page-gates + DB backfill — **Session B. Root cause of duplicates.**
- `c571381` HR Session D parked — no role logic.
- `8d04eea` Onboarding Session E parked — no role logic.

---

## EXIT — awaiting user approval

Zero writes performed this turn. Awaiting user decision on Option A vs B vs C.
