#!/usr/bin/env bash
# Phase 2G — activate the 12 BSH n8n workflows (Phase 1 BSH-1..4 + Phase 2 BSH-5..12)
set -euo pipefail

KEY="${N8N_API_KEY:?N8N_API_KEY required}"
HOST="${N8N_HOST:-http://localhost:5678}"

# Phase 1 workflows
PHASE1=(2TGvy6ct5i1yRaDy j0a1gkfhtffO4NGO bWJdVOhrEkrXa7Ec TQinOm0rIW3dDbg0)
# Phase 2 workflows
PHASE2=(fyn6oq1JPk2lYxLo 0PlMzB0ypYCNXILi KdOewMAeqwGI7ucr Fikr4yhlkcaRkXbn sbAdElYSUloQaocX T3vemVGW5sTVQOyQ L44uqPiR3kTxgjaD 8okfEV1oaNHz9TJA)

for id in "${PHASE1[@]}" "${PHASE2[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "X-N8N-API-KEY: $KEY" \
    "$HOST/api/v1/workflows/$id/activate")
  echo "  $id → HTTP $status"
done

echo "==> done. 12 BSH workflows activated. Verify cron firings via:"
echo "    GET /api/v1/executions?workflowId=<id>&status=success"
