#!/usr/bin/env bash
# Phase 2G — end-to-end smoke for BSH backend. Run AFTER deploy + seed + activate.
set -euo pipefail

TENANT="${TENANT:-bsh-demo}"
BAHMNI="${BAHMNI_URL:-http://localhost:8080}"
LANGGRAPH="${LANGGRAPH_URL:-http://localhost:8123}"

echo "==> Flow A — patient registration → MEDICA risk score"
curl -s -X POST "$LANGGRAPH/agent/medica" \
  -H "Content-Type: application/json" \
  -d "{\"tenant_id\":\"$TENANT\",\"message\":\"Search patients via bahmni_search_patients with query=Karim; give me top 3.\"}" \
  | python3 -c "import sys,json; r=json.load(sys.stdin); print(' ', r.get('response','')[:160])"

echo "==> Flow B — lab critical alert"
curl -s -X POST "$LANGGRAPH/agent/medica" \
  -H "Content-Type: application/json" \
  -d "{\"tenant_id\":\"$TENANT\",\"message\":\"Use bahmni_check_critical_values for today and tell me the count.\"}" \
  | python3 -c "import sys,json; r=json.load(sys.stdin); print(' ', r.get('response','')[:160])"

echo "==> Flow C — doctor in chart"
curl -s -X POST "$LANGGRAPH/omega" \
  -H "Content-Type: application/json" \
  -d "{\"tenant_id\":\"$TENANT\",\"message\":\"Summarize patient BSH-DEMO-001 — labs, drugs, recent visits.\"}" \
  | python3 -c "import sys,json; r=json.load(sys.stdin); print(' ', r.get('response','')[:160])"

echo "==> Flow D — voice OPD via bsh-vapi-handler"
curl -s -X POST "http://localhost:9103/vapi/inbound" \
  -H "Content-Type: application/json" \
  -d "{\"tenant_id\":\"$TENANT\",\"call_id\":\"smoke-1\",\"caller_phone\":\"+8801711111111\",\"transcript\":\"আমি কাল কার্ডিওলজি অ্যাপয়েন্টমেন্ট চাই\",\"language\":\"bn\"}" \
  | python3 -c "import sys,json; r=json.load(sys.stdin); print(' lang:', r.get('language'), '| reply:', r.get('reply','')[:120])"

echo "==> Flow E — multi-branch metrics refresh"
curl -s -X POST "http://localhost:9102/metrics/refresh-now" \
  -H "Content-Type: application/json" \
  -d "{\"tenant_id\":\"$TENANT\",\"metric\":\"opd_volume\"}" \
  | python3 -c "import sys,json; r=json.load(sys.stdin); print(' ', r)"

echo "==> Multi-tenant regression"
curl -s -X POST "$LANGGRAPH/agent/medica" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"cosmique","message":"Use patient_analytics for me. Just return the numbers."}' \
  | python3 -c "import sys,json; r=json.load(sys.stdin); print(' Cosmique baseline:', r.get('response','')[:120])"

echo "==> done. Verify each line above shows expected data."
