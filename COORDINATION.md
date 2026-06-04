# COORDINATION — Gold/Jewelry Vertical (Project JX)

> Cross-session coordination log for the Gold/Jewelry industry vertical build.
> Every Claude Code session working on JX must read this file first, then append a log line.
> If another session is mid-change in an area you intend to touch, note the collision and avoid it.

## Active sessions

| Timestamp (UTC) | Session ID | Phase / Activity | Areas touched | Status |
|---|---|---|---|---|
| 2026-06-04 | jx-p0-discovery | Phase 0 discovery — read-only | none (docs only: COORDINATION.md, STATE_JEWELRY.md, DISCOVERY_FINDINGS.md on branch `feat/jx-p0`) | in progress |
| 2026-06-04T16:09:21Z | jx-p0-discovery (resume) | Phase 0 RESUME — read-only | none (docs only; recovered prior `.tmp_jx` introspection, finishing auth/templates/RLS/risk on branch `feat/jx-p0`) | ✅ complete — DISCOVERY_FINDINGS.md written; Phase 0 closed |
| 2026-06-04T17:05:40Z | jx-p1-provision | Phase 1 — provision Legacy Jewellers tenant_config row + 1 auth login (FIRST production change) | `tenant_config` (INSERT 1 row, slug `legacy-jewellers`); `auth.users`+`public.users`+`public.user_roles` (INSERT/relink 1 owner); new files `repo/tenants/legacy-jewellers/deployment/*` on branch `feat/jx-p1` | ✅ complete 2026-06-04T19:25Z — tenant `f1abef0c-…` LIVE + login verified (V1-V8, Playwright, isolation); **released LOCK: TENANT-PROVISION** |
| 2026-06-04T19:37:27Z | jx-p2-calc | Phase 2 — pure jewelry calc engine + unit tests (NO production change) | new files only: `repo/src/lib/jewelry/calc.ts` + `calc.test.ts` on branch `feat/jx-p2`. No shared files; no DB/n8n/auth. Tested via Node native runner (no package.json change → no FE-PACKAGE lock). | ✅ complete — 15/15 tests pass; zero production changes |

## Locks (claim before editing a shared file in a later phase)

> Phase 0 is read-only and claims NO locks. The table below is the registry future build phases must use.

| Shared resource | Held by | Since | Notes |
|---|---|---|---|
| ~~TENANT-PROVISION~~ | ~~`jx-p1-provision`~~ | — | ✅ **RELEASED 2026-06-04T19:25Z**. Phase 1 done: `legacy-jewellers` (`f1abef0c-…`) + owner login provisioned & verified; zero cross-tenant impact (control byte-identical). |

## Collision notes

- 2026-06-04 — `repo/` clone is on `main` and clean. `frontend/` clone is on `fix/hr-recruitment-sourcing-chain` with ~63 untracked probe files (a different, unrelated session's working tree). JX docs live in the `repo/` clone on branch `feat/jx-p0` to avoid that dirty tree. No overlap.
