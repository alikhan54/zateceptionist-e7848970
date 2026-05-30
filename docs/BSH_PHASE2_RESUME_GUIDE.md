# BSH Phase 2 — Resume Guide (Single Source of Truth)

**Purpose:** Any future CC session resuming BSH-HMS Phase 2 work reads THIS file first.

---

## Step 1 — Read these files in this exact order

1. `D:/420-system/CLAUDE.md` (project root sacred mandate)
2. `D:/420-system/frontend/docs/CC_SESSION_COORDINATION.md` (active sessions)
3. `D:/420-system/docs/BSH_HMS_RESEARCH.md` (Phase 0 architecture decisions — OUTSIDE git at `docs/`, not `frontend/docs/`)
4. `D:/420-system/frontend/docs/BSH_PHASE1_COMPLETE.md` (Phase 1 master handoff — gives you the state Phase 2 builds on)
5. `D:/420-system/frontend/docs/BSH_PHASE2_PREFLIGHT.md` (Phase 2 start-of-session context — TBD: pending Option C confirmation)
6. **This file** (last — current sub-phase status)
7. The most recently-touched `frontend/docs/BSH_PHASE2<letter>_*.md` file

**Doc location convention (unchanged from Phase 1):**
- Phase 0 `BSH_HMS_RESEARCH.md` lives OUTSIDE the frontend git repo at `D:/420-system/docs/`
- All Phase 1 + Phase 2 docs live INSIDE the git repo at `D:/420-system/frontend/docs/BSH_PHASE{1,2}*.md`

---

## Step 2 — Current sub-phase status

| Sub-phase | Status | Last update | Artifact |
|---|---|---|---|
| PF (pre-flight) | 🟡 **IN PROGRESS** — blocked on Option C confirmation | 2026-05-29 | this file + pending preflight |
| 2A–2H | ⏸ NOT STARTED | — | TBD |

---

## Step 3 — Feature branch state

- **Branch:** `feature/bsh-hms-phase2`
- **Created off:** `feature/bsh-hms-phase1` (so Phase 1 docs travel into Phase 2 working tree)
- **Phase 1 tip carried over:** `83e7919 feat(bsh-hms): Phase 1D + 1E + 1F + 1G — 4 n8n workflows, auth plan, definitions.py wiring applied + verified, master handoff`
- **Phase 2 commits so far:** none yet

---

## Step 4 — Live runtime state (inherited from Phase 1, NOT changed in PF)

| Surface | State | Anchor |
|---|---|---|
| `420-langgraph-brain` container | OMEGA=96 tools, MEDICA=19 tools | Phase 1F apply |
| `D:/420-system/langgraph-agents/tools/bahmni_tools.py` | 15 read-only tools, on disk + in container | Phase 1C |
| `D:/420-system/langgraph-agents/agents/definitions.py` | Wired (6 additive lines) — durable via image rebuild | Phase 1F |
| n8n workflows (BSH-1..4) | INACTIVE — `2TGvy6ct5i1yRaDy`, `j0a1gkfhtffO4NGO`, `bWJdVOhrEkrXa7Ec`, `TQinOm0rIW3dDbg0` | Phase 1D |
| `tenant_config` for `bsh-demo` | NO ROW (Phase 2 must add) | Phase 0 design |
| `tenant_config.bahmni_base_url` column | NOT EXIST (Phase 2 must DDL — user applies via Studio) | Phase 0 design |
| Bahmni live | NO (Phase 1A blocked — see `BSH_PHASE1A_DEPLOYMENT.md`) | Phase 1A defer |

---

## Step 5 — Critical guardrails (re-check before any commit)

- [ ] On branch `feature/bsh-hms-phase2` (`git branch --show-current`)
- [ ] Working tree contains only the files this sub-phase intends to add
- [ ] No sacred files modified
- [ ] No `git push origin main` ever
- [ ] No other-session scope touched
- [ ] Concurrent sessions to watch: HR-V4 (KHURRAM ALI active 2026-05-29), Session C / Smart Ledger (autonomous)

---

## Step 6 — Active concurrent sessions (per coord doc + git log)

| Session | Owner | Branch | Recent activity |
|---|---|---|---|
| HR-V4 R3 | KHURRAM ALI | `feature/hr-v3-improvements-safe-DO-NOT-PUSH` | `a493592 feat(hr): R3 — branch cleanup + auto-fire Q-gen + DB trigger + Playwright smoke` |
| Session C / Smart Ledger | autonomous | `session-c-background-work` + worktree `worktrees/frontend-session-c` | `6f4401a test(smart-ledger): comprehensive Phase 1 E2E spec — 12 groups (Phase 10)` |
| BSH Phase 2 (this session) | me | `feature/bsh-hms-phase2` | active |

---

## Step 7 — What this session is blocked on

**Awaiting from user:**
1. **Definition of "Option C architecture"** — visible Phase 2 prompt fragment references "confirmation of Option C architecture understanding" but the option list (Options A/B/C and their meanings) is NOT in the visible prompt. Best inferences below; needs explicit confirmation:
   - Inference candidate 1: industry-gated tool registration (gate at tenant_config lookup inside each tool body, matching Phase 1's `bahmni_base_url IS NULL → not_configured` pattern)
   - Inference candidate 2: a 3-way choice from a Phase 2-scope option list not seen by this session
2. **Sections 1–5 of the Phase 2 handoff doc structure** — visible prompt shows sections 6, 7, 8, 9, 10 of `BSH_PHASE2_COMPLETE.md`. Section 6 is "New BSH tenant creation steps". Sections 1–5 (presumably: executive summary, what was built, sub-phase breakdown, what was verified, what's deferred) are needed to know what to deliver.
3. **Sub-phase mission statements** — Phase 1 had clear sub-phases 1A–1G with mandates. Phase 2's sub-phase structure (2A, 2B, etc.) is not visible.

---

## Step 8 — How to merge `feature/bsh-hms-phase2` to main (when user approves, after AMD deployment)

1. Park concurrent sessions (or coordinate windows)
2. Verify Phase 1 + Phase 2 commits clean on the branch
3. `git checkout main && git pull --rebase origin main`
4. `git merge --no-ff feature/bsh-hms-phase2 -m "merge(bsh-hms): Phase 1+2 backend"`
5. `git push origin main`
6. Rebuild `420-langgraph-brain` image to bake in `bahmni_tools.py` + edited `definitions.py` + Phase 2 additions
7. Run multi-tenant regression sweep
