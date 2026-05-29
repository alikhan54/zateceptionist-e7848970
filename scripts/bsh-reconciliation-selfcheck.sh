#!/usr/bin/env bash
# BSH-HMS Phase 2 reconciliation self-check — run at AMD inside the repo clone.
#   cd D:/420-system/repo && bash scripts/bsh-reconciliation-selfcheck.sh
# Exit 0 = all local ground-truth checks pass. Reports origin push status separately.
set -u
PASS=0; FAIL=0
ok(){ echo "  [PASS] $1"; PASS=$((PASS+1)); }
no(){ echo "  [FAIL] $1"; FAIL=$((FAIL+1)); }

echo "== 1. Branch =="
b=$(git branch --show-current)
[ "$b" = "feature/bsh-hms-phase2-gaps" ] && ok "on $b" || no "expected feature/bsh-hms-phase2-gaps, on $b"

echo "== 2. Gap-fill commits present locally =="
for h in 386ca8f 01556b6 9664a12 e4232cc; do
  git cat-file -e "$h^{commit}" 2>/dev/null && ok "commit $h" || no "missing commit $h"
done

echo "== 3. Base Phase-2 work present (11 commits ahead of main) =="
n=$(git rev-list --count origin/feature/bsh-hms-phase2 ^origin/main 2>/dev/null || echo "?")
[ "$n" = "11" ] && ok "origin/feature/bsh-hms-phase2 = 11 commits ahead of main" || no "expected 11, got $n"

echo "== 4. New files on disk =="
for f in \
  docs/BSH_DEMO_SCRIPT.md docs/BSH_LOOM_SCRIPT.md docs/BSH_FOLLOWUP_EMAILS.md \
  docs/BSH_PITCH_TALKING_POINTS.md docs/BSH_INTELLIGENCE_LAYER_DESIGN.md \
  docs/BSH_PHASE2_RECONCILIATION.md \
  scripts/generate-bsh-fixtures.py supabase/migrations/39-bsh-clinical-log.sql \
  scripts/bsh-demo-data/patients.json scripts/bsh-demo-data/appointments.json \
  scripts/bsh-demo-data/lab_orders.json scripts/bsh-demo-data/corporate_clients.json \
  scripts/bsh-demo-data/packages.json scripts/bsh-demo-data/bed_assignments.json; do
  [ -f "$f" ] && ok "$f" || no "$f MISSING"
done

echo "== 5. Fixture record counts =="
cnt(){ python -c "import json,sys;print(len(json.load(open(sys.argv[1],encoding='utf-8'))))" "$1" 2>/dev/null || echo "?"; }
[ "$(cnt scripts/bsh-demo-data/patients.json)" = "50" ] && ok "patients=50" || no "patients!=50"
[ "$(cnt scripts/bsh-demo-data/lab_orders.json)" = "100" ] && ok "lab_orders=100" || no "lab_orders!=100"
[ "$(cnt scripts/bsh-demo-data/corporate_clients.json)" = "20" ] && ok "corporate=20" || no "corporate!=20"
[ "$(cnt scripts/bsh-demo-data/packages.json)" = "5" ] && ok "packages=5" || no "packages!=5"

echo "== 6. Origin push status (informational) =="
git fetch -q origin 2>/dev/null
if git rev-parse --verify -q origin/feature/bsh-hms-phase2-gaps >/dev/null; then
  if [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/feature/bsh-hms-phase2-gaps)" ]; then
    echo "  [PUSHED] origin/feature/bsh-hms-phase2-gaps == local HEAD"
  else
    echo "  [PARTIAL] origin branch exists but differs from local HEAD — run: git push origin feature/bsh-hms-phase2-gaps"
  fi
else
  echo "  [NOT PUSHED] origin/feature/bsh-hms-phase2-gaps does not exist yet."
  echo "             Fix the GitHub token (write scope) then: git push origin feature/bsh-hms-phase2-gaps"
fi

echo ""
echo "== SUMMARY: $PASS passed, $FAIL failed =="
[ "$FAIL" -eq 0 ] && echo "GROUND TRUTH OK (local)." || echo "SOME LOCAL CHECKS FAILED."
exit $FAIL
