# Recruitment Sourcing — Follow-up & Pending State

> Created 2026-06-04 by the HR-Recruitment-Sourcing session. Companion to the fix
> on branch `fix/hr-recruitment-sourcing-chain`. The core fix (chain reliability,
> watchdog, auto-source-on-post) is **done, deployed, and proven** (10 real LinkedIn
> Video-Editor candidates sourced → shown in the Recruitment UI). This doc captures
> what's left to tune/ship and what to do after the (currently required) reboot.

---

## 1. Quality caveats to tune (not blockers — the chain works)

### a) Match-score shows "6%" in the Candidates table (display/scale mismatch)
- **Symptom:** sourced candidates render `6%` in the Match Score column.
- **Cause:** `hr_candidates.match_score` is `numeric(5,4)` (must be < 10). Phase 4 normalizes Phase 2's `score=60` via `score/10 → 6.0` to fit the column. The UI then renders that stored `6.0` as a percentage → `6%`. So the **storage scale (0–9.99) and the UI's intended scale (0–100%) disagree**.
- **Fix options (pick one, align both ends):** store 0–1 (`0.6`) and format UI as `Math.round(x*100)%`; OR widen the column (e.g. `numeric(5,2)` 0–100) and store `60`, drop the `/10`; OR keep storage and multiply in the UI. Touch points: Phase 4 save node (`0Z1A7e5Cp8LraOnL`, the `normalisedScore` block) + the Candidates table render in `src/pages/hr/Recruitment.tsx`.

### b) harvestapi enrichment returned 0 (no emails / skills / experience)
- **Symptom:** run `f6a1757c` had `phase3_profiles_enriched=0`; candidates have name/title/LinkedIn (from Phase 2 akash9078) but **no email/skills/experience**, and `enrichment_status` ends `failed`/`pending`.
- **Cause (to confirm):** Phase 3 (`PWb5cPBpK4FTgwwW`) calls `harvestapi~linkedin-profile-scraper` with the scraped URLs and keys results by `it.linkedinUrl || it.url` (normalized, trailing-slash stripped). Either the actor returned nothing for those URLs, or the URL shape from akash9078 doesn't match harvestapi's output keys, so the `byUrl` lookup misses every profile.
- **Next step:** run the harvestapi actor manually against 2–3 of the scraped URLs, inspect the returned item keys, and reconcile the matching in Phase 3. Premium tenants pay for this enrichment, so it should land emails+skills when fixed.

### c) Broad Apify search returns off-target real profiles
- **Symptom:** for "Video Editor / Karachi", ~6/10 were on-target (Video Editor, Creative Video Editor, CG Artist, designer); ~4 were real-but-off-target (e.g. Psychologist, Accountant).
- **Cause:** Phase 2 (`XjSilVmjJeRIwNMF`) query is `"<title>" "<location>" <first 3 skills>` against akash9078, which returns a loose mix.
- **Fix options:** stricter title gating (post-filter candidates whose `title/headline` contains a job-title keyword), apply `hr_job_requisitions.min_match_score` to drop low-relevance before save, or tighten the query (quote the title, drop noisy skill terms). No fakes are produced — this is purely relevance tuning.

---

## 2. One un-captured proof: the auto-source run-row screenshot
- **Already proven:** posting a job auto-fires sourcing **without a manual click** — browser console showed `[WEBHOOK] POST /hr/job/trigger-sourcing-v2` from `useCreateJob.onSuccess` (`useRecruitment.ts:367`), `trigger_type:'auto'`. It only failed locally with `TypeError: Failed to fetch` = `localhost → prod-webhook` **CORS** (a preview-only artifact; production is same-origin). The backend auto-guard (premium+Apify + idempotent) is verified present + `active` in Supabase.
- **Not yet screenshotted:** the resulting **run row** in the UI (blocked first by CORS, then by the Docker outage).
- **To capture after Docker is back** (QA test job `f61f8ba9` "QA AutoSource Test - Graphic Designer", Zate):
  ```bash
  curl -s -X POST http://localhost:5678/webhook/hr/job/trigger-sourcing-v2 \
    -H "Content-Type: application/json" \
    -d '{"job_requisition_id":"f61f8ba9-6949-4e01-9640-cbcc1a5b8928","tenant_id":"ac308ab6-f381-4eef-88ec-4d5c7a860ff9","trigger_type":"auto"}'
  ```
  Then `/hr/recruitment` → **Sourcing** tab → screenshot the `auto` run row. A 2nd identical curl must **skip** (idempotency guard).

---

## 3. Pending state — what's shipped vs. not

| Layer | State |
|---|---|
| **n8n chain hardening** (entry `YsOhnEct1zWljE3L`, P1 `l1RMxMScCbvXOqmm`, P2 `XjSilVmjJeRIwNMF`, P3 `PWb5cPBpK4FTgwwW`, P4 `0Z1A7e5Cp8LraOnL`) | **LIVE + persisted** in Supabase `n8n` schema (`active=true`). Survives the reboot. |
| **Watchdog cron `k99volCaSogFb6un`** | **LIVE + persisted.** Already auto-unstuck the real stale run. (See §4 — re-register after reboot.) |
| **Frontend** (`useRecruitment.ts`, `Recruitment.tsx`) | **Committed, NOT shipped.** Branch `fix/hr-recruitment-sourcing-chain`: `deb30a4` (auto-source wiring + **duplicate-`Bot`-import fix**) + `dc3ff55` (docs). **UNPUSHED — no Lovable deploy.** |

⚠️ **The frontend `deb30a4` also fixes a pre-existing crash:** a duplicate `import { Bot }` (on main since `2abb4f7`) throws *"Identifier 'Bot' has already been declared"* and breaks the **entire** Recruitment page render. **Until this branch ships, the Recruitment page is broken on main/production.** Ship priority is therefore higher than "just the sourcing feature."

**To ship:** review the branch → fast-forward/merge to `main` → Lovable rebuild → Publish. No DB migration needed (no schema changes in this branch).

---

## 4. POST-REBOOT reminder — re-register crons

A Docker/n8n restart re-darkens schedule-triggered workflows; full cron re-registration takes ~35–58 min and (per the bootstrap) has needed manual nudging. After the box reboots and Docker recovers:

1. `cd D:/420-system && docker compose --env-file .env up -d` (restore the stack).
2. Verify + heal cron registration (report-only first, then `--heal`):
   ```bash
   K=<n8n-api-key> /c/Python314/python D:/420-system/scripts/n8n_verify_heal.py
   K=<n8n-api-key> /c/Python314/python D:/420-system/scripts/n8n_verify_heal.py --heal
   ```
3. **Confirm the new watchdog `k99volCaSogFb6un` is active and registered** (it's schedule-triggered → most at risk of staying dark). The 5 sourcing workflows are webhook-triggered → they re-register faster on boot, but verify the entry webhook `/hr/job/trigger-sourcing-v2` responds.
4. Confirm the rest of the sentinels (Sacred Sentinel Hot Path, Alert Dispatcher, etc.) came back.

---

## Cleanup
- Delete test job `f61f8ba9` after the §2 auto-source check.
- Delete `%LOCALAPPDATA%\Docker\run_broken_socket` (orphaned dir from the outage triage; deletable after reboot clears the stuck socket).
- The Docker engine crash was a **DD 4.45 bug** (orphaned `dockerInference` AF_UNIX socket), independent of this work; a reboot clears it.
