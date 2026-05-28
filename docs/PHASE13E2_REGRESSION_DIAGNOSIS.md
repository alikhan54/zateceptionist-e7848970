# Phase 13.E.2 — Verify Actual Fix State (read-only)

**Date:** 2026-05-24
**Reporter:** adeel@zatesystems.com — after applying Option A SQL + hard logout + incognito login, sidebar still renders as "Staff".
**Diagnosis type:** Read-only forensic. Zero writes this session.

---

## TL;DR

The original Phase 13.E diagnosis was **incomplete in two ways**:

1. **Option A SQL did NOT run.** All 5 duplicate rows it proposed to delete are still present in `public.user_roles`. Plus a 3rd row I missed in the original report.
2. **Even if Option A had run, it would NOT have fixed adeel.** His active JWT subject is `16228725-af1a-4f81-9296-bd363f78efb8` (the STAFF `public.users` row), not `4c60c257-fdfb-447e-bdee-98809356b7fe` (the ADMIN `public.users` row). Deduping the admin row's `user_roles` data was deduping the wrong record.

Net effect: the original recommendation was misdirected. The real fix is at the `public.users` layer (which row the JWT maps to), not the `public.user_roles` layer.

---

## Step 1 — Re-verify `public.user_roles` for both adeel user_ids

3 rows currently exist (Option A would have removed 1; all 3 still present):

| id | user_id | role | tenant_id | created_at | Note |
|---|---|---|---|---|---|
| `e09d7fe9-967b-41e0-9edc-8d3f0efe3ff1` | `4c60c257-…` (admin users row) | admin | NULL | 2026-01-08 | Pre-existing, untouched by backfill |
| `3cc347cb-cddb-4ac5-8879-6687f25e155e` | `4c60c257-…` (admin users row) | admin | zateceptionist | 2026-05-24 | **Session B backfill** — Option A would have deleted this. **Still present.** |
| `e1e66a89-…` | `16228725-…` (staff users row) | staff | zateceptionist | 2026-05-24 | **Session B backfill — missed in Phase 13.E original report.** This is the row the JWT actually reads. |

**Conclusion:** Option A SQL did not execute. (No DELETE happened; row `3cc347cb-…` still present.)

---

## Step 2 — `auth.users` for adeel: which user_id is the active JWT subject?

Via `/auth/v1/admin/users?email=adeel@zatesystems.com`:

| auth.users.id | last_sign_in_at | Active session? |
|---|---|---|
| `4c60c257-fdfb-447e-bdee-98809356b7fe` | (older) | No |
| **`16228725-af1a-4f81-9296-bd363f78efb8`** | **2026-05-24T17:43:07.8527Z** | **YES — this is the JWT subject** |

The most recent sign-in is to `16228725-…`. Supabase Auth issued a JWT with `sub=16228725-…`. Every `auth.uid()` server-side and every `useAuth()` client-side reads that ID.

---

## Step 3 — How the role gets resolved in the active path

`AuthContext.tsx:145-155`:

```tsx
const { data: roleData, error: roleError } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userData.id)   // ← userData.id = 16228725-… (from JWT)
  .maybeSingle();
```

With JWT subject = `16228725-…`:
- Only **one** matching `user_roles` row: `e1e66a89-…` (role=`staff`, tenant_id=`zateceptionist`).
- `.maybeSingle()` succeeds cleanly (1 row, not >1).
- `userRole = 'staff'`.
- NavigationSidebar renders staff-only view.

This is **not a duplicate-row bug**. It's a **wrong-users-row bug**. The bug we thought we were diagnosing (>1 row → maybeSingle errors → defaults to staff) never applied to adeel's actual session. His query returns cleanly with `role='staff'` because there is genuinely a staff row pointing at his JWT subject.

---

## Step 4 — Why does the staff users row exist at all?

`public.users` table for adeel@zatesystems.com:

| id | role | created_at | Origin (guess) |
|---|---|---|---|
| `4c60c257-fdfb-447e-bdee-98809356b7fe` | admin | 2026-01-07 | Original onboarding |
| `16228725-af1a-4f81-9296-bd363f78efb8` | staff | 2026-01-16 | Likely a team-invite flow at zateceptionist that created a second `public.users` row + a fresh `auth.users` row with the same email |

There's no constraint preventing two `public.users` rows for the same email (Supabase Auth treats `auth.users.id` as the canonical key; `public.users.email` isn't unique).

Sometime between 2026-01-16 and today, adeel's normal sign-in started landing on `16228725-…` instead of `4c60c257-…` (likely because that's the row tied to the auth.users record matching his latest email-link / password reset / invite-accept).

---

## Step 5 — Why Phase 13.E's "Staff renders" symptom is real but for a different reason

Phase 13.E correctly identified that 4 OTHER admin users (zatesystems7@gmail.com / marhama1991 / admin@rewerck-roofing / asra) DO have the `.maybeSingle()` duplicate-row failure. Option A is still the right fix for them.

But for adeel specifically, the symptom comes from the staff users row being the JWT target, not from the duplicate.

---

## Revised fix proposals

### Option A (refined) — apply original A + add staff-row cleanup for adeel

1. Run the 5 deletes from Phase 13.E Option A (still correct for the 4 OTHER affected users).
2. Additionally, for adeel: delete or remap so the active JWT subject (`16228725-…`) resolves to admin. Three sub-options:

   **A1. Change role on the staff users row (data fix, single UPDATE)**
   ```sql
   UPDATE public.users SET role='admin' WHERE id='16228725-af1a-4f81-9296-bd363f78efb8';
   UPDATE public.user_roles SET role='admin' WHERE id='e1e66a89-…';
   ```
   Pros: instant, reversible. Cons: keeps the dual-users-row legacy in place. Risk: if the staff row was created for a reason (a separate person on team), this elevates them too. (Mitigated: both rows share adeel's email; very unlikely to be two distinct humans.)

   **A2. Delete the staff users + staff user_roles row, force JWT to repoint**
   ```sql
   DELETE FROM public.user_roles WHERE id='e1e66a89-…';
   DELETE FROM public.users WHERE id='16228725-af1a-4f81-9296-bd363f78efb8';
   -- also delete from auth.users via Admin API, OR merge the auth.users row
   ```
   Pros: cleanest end state. Cons: deletes auth history; risk of FK breakage in tables that reference the staff users row by id (sales_leads.assigned_to, hr_employees.user_id, activity_log.user_id, etc.). Recommend audit before this.

   **A3. Re-issue invite from admin row, sign out, re-login**
   Send a fresh magic link from `4c60c257-…`'s auth row. After sign-in, JWT subject flips back to `4c60c257-…`, where 2 admin user_roles rows exist → triggers Phase 13.E `.maybeSingle()` bug → still renders as staff.
   Pros: no destructive data ops. Cons: doesn't actually work without ALSO running original Option A first to dedupe `4c60c257-…`'s user_roles.

### Option B (code-side, defensive) — fix `.maybeSingle()` AND add identity fallback

Modify `AuthContext.tsx` to:
1. Tolerate >1 user_roles row (Phase 13.E Option B).
2. If `roleData` returns role='staff' but `public.users.role='admin'` for the same id (data inconsistency), prefer the higher privilege.

Pros: handles edge cases generically. Cons: AuthContext.tsx is foundational; needs careful review.

### Option C (recommended) — A1 + original Option A

For adeel: A1 (single UPDATE on his staff users row → admin).
For the other 4 users: original Phase 13.E Option A SQL (delete 5 backfill rows).

Total: 1 UPDATE + 5 DELETEs (or 4 if we exclude adeel's `3cc347cb-…` which becomes redundant after A1 since the JWT no longer hits the admin user_id). 6 SQL statements, all reversible from documented row IDs.

Reasons:
- Fastest, smallest blast radius
- A1 is one-statement reversible
- Doesn't touch auth.users (no risk of breaking SSO links)
- Doesn't deduplicate the staff users row (preserves any FK references to `16228725-…` in other tables — which we should audit but don't have to delete to fix the symptom)

---

## What did NOT happen

- Option A SQL was never executed against production. Row `3cc347cb-…` still present.
- No code changes were made this session.
- No data was modified.

---

## Why my original report missed this

Phase 13.E enumerated `user_roles` rows by joining backwards from `users.email='adeel@zatesystems.com'` to all matching `users.id`s, then to user_roles. The 3rd row (`e1e66a89-…` for the staff users row) WAS in that result set but I anchored the recommendation on the admin row's duplicate (`3cc347cb-…`) without checking which `users.id` the active JWT actually mapped to. That was the gap.

Lesson for future auth-debug work: always start from `auth.users.last_sign_in_at` to identify the JWT subject FIRST, then trace `users.id` → `user_roles`, not the other way around.

---

## Awaiting user decision

Recommended: **Option C** (A1 update for adeel + original Option A deletes for the other 4).

Zero writes performed this turn. No code modified. Awaiting explicit approval before applying any of A1, A2, A3, original A, or B.
