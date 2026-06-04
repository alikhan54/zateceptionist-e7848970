# COORDINATION — Gold/Jewelry Vertical (Project JX)

> Cross-session coordination log for the Gold/Jewelry industry vertical build.
> Every Claude Code session working on JX must read this file first, then append a log line.
> If another session is mid-change in an area you intend to touch, note the collision and avoid it.

## Active sessions

| Timestamp (UTC) | Session ID | Phase / Activity | Areas touched | Status |
|---|---|---|---|---|
| 2026-06-04 | jx-p0-discovery | Phase 0 discovery — read-only | none (docs only: COORDINATION.md, STATE_JEWELRY.md, DISCOVERY_FINDINGS.md on branch `feat/jx-p0`) | in progress |
| 2026-06-04T16:09:21Z | jx-p0-discovery (resume) | Phase 0 RESUME — read-only | none (docs only; recovered prior `.tmp_jx` introspection, finishing auth/templates/RLS/risk on branch `feat/jx-p0`) | ✅ complete — DISCOVERY_FINDINGS.md written; Phase 0 closed |

## Locks (claim before editing a shared file in a later phase)

> Phase 0 is read-only and claims NO locks. The table below is the registry future build phases must use.

| Shared resource | Held by | Since | Notes |
|---|---|---|---|
| (none yet) | — | — | Phase 0 makes zero production changes |

## Collision notes

- 2026-06-04 — `repo/` clone is on `main` and clean. `frontend/` clone is on `fix/hr-recruitment-sourcing-chain` with ~63 untracked probe files (a different, unrelated session's working tree). JX docs live in the `repo/` clone on branch `feat/jx-p0` to avoid that dirty tree. No overlap.
