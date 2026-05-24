# CC Multi-Session Coordination

**Last updated:** 2026-05-24 (Session: Cosmique Mobile, Phase 13.D close)

User runs 2-3 Claude Code sessions in parallel on this repo. Sessions can clobber each other unless they declare scope + coordinate via this file.

---

## Active sessions

### Session A — Cosmique Mobile (Phases 13.A → 13.D)

- **Scope (read + write):**
  - `frontend/src/index.css` (mobile media query block only)
  - `frontend/src/components/layout/Header.tsx` (Phase 13.A shipped — no further edits expected)
  - `frontend/tests/cosmique-phase13a-mobile.spec.ts`
  - `frontend/tests/cosmique-phase13a-mobile-baseline.spec.ts`
  - `frontend/tests/cosmique-phase13d-diagnose.spec.ts`
  - `frontend/tests/cosmique-phase13d-dispatch.spec.ts`
  - `frontend/tests/phase13a-mobile-results.json`
  - `frontend/tests/phase13d-diagnose.json`
  - `frontend/tests/screenshots/phase13a-mobile-baseline/`
  - `frontend/tests/screenshots/phase13a-mobile/`
  - `frontend/tests/screenshots/phase13d/`
  - `frontend/docs/COSMIQUE_PHASE13A_MOBILE.md`
  - `frontend/docs/COSMIQUE_PHASE13C_REPORT.md`
  - `frontend/docs/COSMIQUE_PHASE13D_REPORT.md`
  - `frontend/docs/COSMIQUE_STATUS.md` — **mobile phase rows only** (28, 29, 30, 31). Other rows belong to other sessions.

- **Read-only (sacred — already touched once with explicit approval, now frozen):**
  - `frontend/src/components/NavigationSidebar.tsx` (Phase 13.C 1-line edit USER-APPROVED + applied)
  - `frontend/src/components/ui/sidebar.tsx`
  - `frontend/src/components/Layout.tsx`

- **MUST NOT TOUCH (other sessions' surface):**
  - Anything in `frontend/src/pages/settings/`
  - Anything in `frontend/tests/settings-*`
  - `frontend/src/pages/accounting/` (Smart Ledger session)
  - `frontend/tests/smart-ledger-*` (Smart Ledger session)
  - `frontend/tests/hr-*` (HR session if running)

### Session B — Cosmique Settings Audit (Phase 2)

- **Scope (read + write):**
  - `frontend/tests/settings-audit.spec.ts`
  - `frontend/tests/settings-audit-deep.spec.ts`
  - `frontend/tests/settings-audit-empty-state.spec.ts`
  - `frontend/tests/settings-audit-isolation.spec.ts`
  - `frontend/tests/settings-aamerah-auth.setup.ts`
  - `frontend/tests/settings-acsfx-auth.setup.ts`
  - `frontend/tests/settings-discovery.spec.ts`
  - `frontend/tests/settings-q1-team-access.spec.ts`
  - `frontend/tests/helpers/dismiss-onboarding.ts` (and the rest of `tests/helpers/` if used)
  - `frontend/playwright.config.ts` — **additions only**, never remove existing projects
  - `frontend/docs/SETTINGS_AUDIT_*.md`
  - `frontend/docs/COSMIQUE_STATUS.md` — settings phase rows only

- **Read-only (static analysis):**
  - `frontend/src/pages/settings/*.tsx`
  - `frontend/src/contexts/AuthContext.tsx`, `RoleContext.tsx` (or wherever the role/permission gate lives)

- **MUST NOT TOUCH:**
  - Anything else in `frontend/src/`
  - `frontend/tests/cosmique-phase13*`
  - `frontend/src/components/layout/Header.tsx`, `NavigationSidebar.tsx`, `Layout.tsx`, `ui/sidebar.tsx`, `index.css`

### Session C — Smart Ledger Phase 1 / D7-B Finance

- **Scope (read + write):**
  - `frontend/src/pages/accounting/Finance.tsx` and the new `useFinanceKpis.ts`, `useRecentTransactions.ts`, `useRevenueTrend.ts`, `useTopClientsByRevenue.ts`
  - `frontend/tests/smart-ledger-finance.spec.ts`
  - `frontend/tests/smart-ledger-comprehensive-e2e.spec.ts`
  - `frontend/tests/smart-ledger-jobs.spec.ts`
  - `frontend/tests/smart-ledger-mobile.spec.ts`
  - `frontend/playwright.config.ts` — additions only
  - Smart Ledger tenant deployment scripts at `D:/420-system/tenants/smart-ledger/` (separate from `frontend/`)

- **MUST NOT TOUCH:**
  - Anything in `frontend/src/components/`
  - Anything in `frontend/src/pages/clinic/`, `marketing/`, `sales/`, `hr/`
  - `frontend/tests/cosmique-phase*`
  - `frontend/tests/settings-*`
  - `frontend/src/index.css` (mobile media query is owned by Session A)

### Session D (potential) — HR fixes

- **Scope:** `frontend/tests/hr-*` (already-running specs + result JSON), no `src/` edits expected
- Should declare itself here if active

---

## Coordination protocol

### Every session, BEFORE every `git commit`:

```bash
cd D:/420-system/frontend
git fetch origin
git status
git rev-list --left-right --count main...origin/main
# If behind > 0:
git pull --rebase origin main
# If rebase conflicts in OUT-OF-SCOPE files → STOP, surface to user
# If rebase conflicts in IN-SCOPE files → review carefully; resolve only if obviously safe
git push origin main
```

### Every 30 minutes or at phase boundary:

1. Append a one-line entry to the "Recent commits" log below with: timestamp, session name, commit hash, scope touched.
2. Bump the "Last updated" timestamp at the top.

### Lovable rebuild coordination

Lovable rebuilds on every push to `origin/main`. Sessions should:
- **Commit + push immediately** when their work is testable (don't sit on local commits)
- **Don't wait** for "perfect" state to push — incremental rebuilds are better than big-bang ones at 3am

Each session checks bundle hash after their push to confirm rebuild. If two sessions push within ~2 minutes, Lovable may batch them — that's fine.

### Sacred file mandate (unchanged across all sessions)

The sacred list is fixed by `COSMIQUE_STATUS.md` "DO NOT TOUCH" section:
- `NavigationSidebar.tsx` (Phase 13.C 1-line edit was USER-APPROVED — no further edits)
- `ui/sidebar.tsx` (shadcn primitive)
- `Layout.tsx`
- `Header.tsx` (Phase 13.A shipped — frozen)
- `usePulseData.ts`, `sectionsRegistry.ts`
- `formatCurrency.ts`
- All Phase 1-13 shipped pages/hooks unless their owning session explicitly extends them

Any session that needs a sacred edit MUST:
1. Surface the proposed patch text to the user in chat
2. Wait for explicit approval
3. Take a pre-edit backup
4. Apply, diff, verify, document

---

## Recent commits log

(Append-only. Each session adds an entry after pushing.)

- `2026-05-24` · Session A · `3f50fe2` · Phase 13.D docs (report + STATUS row 31). CSS-only fix at `246fc8a`.
- `2026-05-24` · Session A · `246fc8a` · Phase 13.D CSS additive (inner div stretches to 44px). No sacred edits.
- `2026-05-24` · Session A · `c9733a1` · Phase 13.C closure report.
- `2026-05-24` · Session A · `7d07603` · Phase 13.C 1-line sacred edit (USER-APPROVED) on NavigationSidebar.tsx.

---

## Quick "STATUS CHECK" prompt for other sessions

Paste this into other CC sessions so they sync with this file:

> Read `D:/420-system/frontend/docs/CC_SESSION_COORDINATION.md`. Confirm your session's scope is registered there. If it isn't, add a new "Session X" entry under "Active sessions" with your exact read+write file list and your MUST-NOT-TOUCH list. Then commit the coordination file with message `chore(coordination): register Session X scope` and push. Do this BEFORE making any code changes this turn.

---

## Notes

- Untracked files visible in `git status` (numerous `tests/screenshots/`, JSON result files, marketing `.backup*` files) are local-only work artifacts. They're not under coordination scope until they're staged/committed.
- `playwright.config.ts` may be modified by multiple sessions adding project entries — that's expected. Conflicts on this file should be merged by keeping ALL project entries (additive union).
