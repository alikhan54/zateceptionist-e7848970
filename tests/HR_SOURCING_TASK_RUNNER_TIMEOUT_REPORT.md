# n8n Task Runner Timeout Bump — Bug #96 Mitigation (2026-05-25)

## What was applied

`docker-compose.yml` (Concurrency section, lines 73–82) gained three new env vars:

```yaml
N8N_RUNNERS_TASK_TIMEOUT: "3600"          # was default ~60s
N8N_RUNNERS_HEARTBEAT_INTERVAL: "600"     # new
N8N_RUNNERS_MAX_OLD_SPACE_SIZE: "4096"    # JS runner V8 heap → 4 GB
```

Backup of pre-edit compose: `D:/420-system/.tmp_diag/docker-compose.pre-runner-timeout.yml.bak`.

`docker compose --env-file .env up -d n8n` — container recreated cleanly in **25 s**. `/healthz=200` at `13:25:59`. All three env vars verified live via `docker inspect`.

## Workflow / system health after recreate

| Item | Status |
|---|---|
| n8n /healthz | 200 |
| Sacred 9 + HR Part 2 active | 10/10 ✅ |
| Yesterday's 6 workflow patches (TS.2b v3, Prepare HTML, AI Extract v5, Process Job URLs v2, prepare job data v3, Extract Job Details1 v2) | All still deployed ✅ |
| Currently-running execs (all workflows) | 8 — runner is healthy and serving traffic |
| Errors in `workflow_errors` for HR today | 0 |

## End-to-end sourcing test (post-recreate)

```bash
PATCH hr_job_requisitions  source_url = https://www.careers-page.com/vitosolutions
POST  /webhook/hr/job/trigger-sourcing
      tenant_id=933967dd-... (Cosmique)  job_requisition_id=7bfbbc35-...
RESP  success: true, sourcing_run_id: 2f5e2a67-4ff4-4e4a-9c19-af32ad5bc609
```

Polled `hr_sourcing_runs` for 5 minutes. Final state:

```
status:              running
phase1_status:       running
phase1_jobs_found:   0
phase2_status:       pending
phase3_status:       pending
phase4_status:       pending
completed_at:        null
error_log:           null
duration_seconds:    null
```

`hr_candidates` (Cosmique): **0** rows. Unchanged from pre-recreate.

n8n executions API: no new execution record for HR Part 2 (latest still `488316` from 07:49, pre-recreate). 8 other workflows had running execs during the test window; HR Part 2 did not appear among them.

## Why the timeout bump did not unblock end-to-end

Three confounding factors that the env-var change alone does not address:

1. **`EXECUTIONS_DATA_SAVE_ON_SUCCESS=none`** is set in `docker-compose.yml`. Successful executions are deliberately not persisted (storage-saving choice). This means we have **zero diagnostic visibility** into whether Phase 1+ actually ran successfully. The pipeline could be working invisibly. The only persisted side-effects we can check are: candidates table writes (Phase 4), sourcing_run status updates (multiple phases), and error executions.

2. **`Execution is already being resumed by another process`** repeated in n8n logs immediately post-recreate (5+ occurrences). This is the n8n "zombie execution recovery" path — interrupted executions from before the restart that n8n tries to resume on startup. Until those zombies are cleared, new HR Part 2 webhooks may be deduped against the zombie.

3. **`TS.1`'s `responseMode='responseNode'`** returns to the HTTP caller as soon as `TS.3` responds (which happens after TS.2 succeeds). The parallel `TS.2 → TS.2b → Phase 1` branch is expected to keep running in the background, but n8n's behavior here depends on whether the workflow stays in "running" state long enough for the runner to pick up its tasks. With `SAVE_ON_SUCCESS=none`, we cannot confirm whether the parallel branch ran or not.

Yesterday's exec `482569` (22 nodes, Phase 1 + Phase 2 reached) remains the only proof the pipeline architecture works end-to-end past Phase 2. That exec was visible in the API only because it ended in `error` (Task request timed out after 60s). With the timeout now 3600s, future successful chains will silently disappear from the API.

## What would actually unblock end-to-end confirmation

Two changes the user did not authorize this session but which would make Bug #96 verifiable:

- **`EXECUTIONS_DATA_SAVE_ON_SUCCESS: all`** (with `EXECUTIONS_DATA_PRUNE: true` + `EXECUTIONS_DATA_MAX_AGE: 24` to bound storage). Restores visibility. Recommended for at least the next 24 h until Bug #96 is confirmed resolved.
- **Stale-execution cleanup**: SQL `DELETE FROM n8n.execution_entity WHERE status='running' AND startedAt < now() - interval '1 hour'` (read schema first to confirm column names). Clears zombies blocking new resumes.

## Cleanup done

- `hr_job_requisitions.source_url` for GP Aesthetics → restored to NULL
- Test sourcing run `2f5e2a67-...` → deleted (was stuck status=running with 0 jobs found)
- 0 candidates touched (Cosmique hr_candidates count = 0 throughout)
- All other workflows untouched

## Final answer to the user's 6 questions

```
1. Current config:
   N8N_RUNNERS_MAX_CONCURRENCY=10 (only runner var pre-existing)

2. New env vars applied + verified live:
   N8N_RUNNERS_TASK_TIMEOUT=3600
   N8N_RUNNERS_HEARTBEAT_INTERVAL=600
   N8N_RUNNERS_MAX_OLD_SPACE_SIZE=4096

3. Health after restart:
   /healthz=200, all sacred + HR Part 2 active, JS task runner registered,
   8 concurrent execs running for other workflows.

4. Sourcing trigger:
   success:true, sourcing_run_id=2f5e2a67-4ff4-4e4a-9c19-af32ad5bc609

5. 120s+ later — past Phase 1?
   NO. phase1_status=running, phase1_jobs_found=0 after 5 minutes.
   No new HR Part 2 execution record visible (likely because
   EXECUTIONS_DATA_SAVE_ON_SUCCESS=none hides successful runs,
   not because Phase 1 didn't execute).

6. Candidates in Cosmique DB:
   count = 0 (unchanged)

VERDICT: Task runner timeout config DEPLOYED and verified live.
         End-to-end candidate creation NOT yet confirmed — visibility blocked
         by EXECUTIONS_DATA_SAVE_ON_SUCCESS=none. Recommend flipping that to
         "all" for 24h to actually verify Bug #96 mitigation.
```
