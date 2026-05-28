# BSH Phase 1 — Resume Guide (Single Source of Truth)

**Purpose:** Any future CC session resuming BSH-HMS Phase 1 work reads THIS file first.

---

## Step 1 — Read these files in this exact order

1. `D:/420-system/CLAUDE.md` (project root sacred mandate)
2. `D:/420-system/frontend/docs/CC_SESSION_COORDINATION.md` (active sessions)
3. `D:/420-system/docs/BSH_HMS_RESEARCH.md` (Phase 0 architecture decisions — OUTSIDE the git repo at `docs/`, not `frontend/docs/`; preserved at original path for stable external links)
4. `D:/420-system/frontend/docs/BSH_PHASE1_PREFLIGHT.md` (Phase 1 start-of-session context)
5. **This file** (last — current sub-phase status)
6. The most recently-touched `frontend/docs/BSH_PHASE1<letter>_*.md` file (sub-phase artifact)

**Doc location convention (important):**
- Phase 0 `BSH_HMS_RESEARCH.md` lives at `D:/420-system/docs/` (OUTSIDE the frontend git repo).
- All Phase 1 docs live at `D:/420-system/frontend/docs/BSH_PHASE1*.md` (INSIDE the git repo, so they ride with `feature/bsh-hms-phase1`).

---

## Step 2 — Current sub-phase status

| Sub-phase | Status | Last update | Artifact |
|---|---|---|---|
| PF (pre-flight) | ✅ COMPLETE | 2026-05-29 | `BSH_PHASE1_PREFLIGHT.md` |
| 1A (Bahmni deploy) | ⏳ IN PROGRESS | — | `BSH_PHASE1A_DEPLOYMENT.md` (pending) |
| 1B (seed data) | ⏸ NOT STARTED | — | `BSH_PHASE1B_SEED_DATA.md` (pending) |
| 1C (bahmni_tools) | ⏸ NOT STARTED | — | `BSH_PHASE1C_AGENT_TOOLS.md` (pending) |
| 1D (n8n bridges) | ⏸ NOT STARTED | — | `BSH_PHASE1D_WORKFLOWS.md` (pending) |
| 1E (auth bridge plan) | ⏸ NOT STARTED | — | `BSH_PHASE1E_AUTH_BRIDGE_PLAN.md` (pending) |
| 1F (graph.py wire + smoke) | ⏸ NOT STARTED | — | `BSH_PHASE1F_GRAPH_WIRING.md` + `BSH_PHASE1F_SMOKE.md` (pending) |
| 1G (handoff) | ⏸ NOT STARTED | — | `BSH_PHASE1_COMPLETE.md` (pending) |

---

## Step 3 — Feature branch state

- **Branch:** `feature/bsh-hms-phase1`
- **Starting commit:** `ae3a13c [WARRIOR] Merge: format-variant chips + Copy Embed`
- **Last commit on this branch:** _(updated by each sub-phase)_

---

## Step 4 — Active checkpoints completed

| Checkpoint | Date | Token cost | Notes |
|---|---|---|---|
| Pre-flight | 2026-05-29 | ~200 | Docs written, feature branch created, stash recorded |

---

## Step 5 — Critical guardrails (re-check before any commit)

- [ ] On branch `feature/bsh-hms-phase1` (`git branch --show-current`)
- [ ] Working tree contains only the files this sub-phase intends to add
- [ ] No sacred files modified (see `BSH_PHASE1_PREFLIGHT.md` § Sacred files)
- [ ] No `git push` to any branch
- [ ] No other-session scope touched

---

## Step 6 — Outstanding stash from PF (must restore on HR-V3 resume)

- `stash@{0}: BSH-PHASE1-PREFLIGHT: stash other-session MyHR.tsx`
- HR-V3 session, on resume, must run: `git stash apply stash@{0}` (or pop if no longer needed elsewhere).
- This session does NOT pop the stash — it's held safely for HR-V3.

---

## Step 7 — How to merge feature/bsh-hms-phase1 to main (Phase 1 only, when user approves)

User-driven. Suggested steps:
1. Park all other active sessions
2. Run audit session against `feature/bsh-hms-phase1`
3. `git checkout main && git pull --rebase origin main`
4. `git merge --no-ff feature/bsh-hms-phase1 -m "merge(bsh-hms): Phase 1 backend (Bahmni + agent tools + n8n bridges)"`
5. `git push origin main`
6. Lovable will rebuild from main (Phase 1 = backend-only, no frontend impact, but bundle hash will still update)
7. Restart `420-langgraph-brain` container so the new `bahmni_tools.py` registers
8. Activate the 4 new n8n bridge workflows in the n8n UI (Phase 1F left them inactive)
9. Run multi-tenant regression sweep one more time
