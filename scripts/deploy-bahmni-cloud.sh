#!/usr/bin/env bash
# BSH-HMS Phase 2G — Deploy Bahmni stack to AMD-local Docker.
# Idempotent. Refuses to deploy if the BSH tenant_config row says non-hospital.
set -euo pipefail

TENANT_ID="${TENANT_ID:-bsh-demo}"
BAHMNI_DIR="${BAHMNI_DIR:-/opt/bahmni-stack}"
BAHMNI_REPO="${BAHMNI_REPO:-https://github.com/Bahmni/bahmni-docker.git}"
BAHMNI_FLAVOR="${BAHMNI_FLAVOR:-bahmni-lite}"  # vs bahmni-standard for IPD/PACS

echo "==> 1/8 — verify SUPABASE_SERVICE_KEY"
[ -n "${SUPABASE_SERVICE_KEY:-}" ] || { echo "ERROR: SUPABASE_SERVICE_KEY required"; exit 1; }

echo "==> 2/8 — verify tenant_config industry"
INDUSTRY=$(curl -s -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  "https://fncfbywkemsxwuiowxxe.supabase.co/rest/v1/tenant_config?tenant_id=eq.${TENANT_ID}&select=industry" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d[0]["industry"] if d else "missing")')
[ "$INDUSTRY" = "healthcare_hospital" ] || {
  echo "REFUSING: tenant ${TENANT_ID} industry=${INDUSTRY}, expected healthcare_hospital"; exit 2;
}

echo "==> 3/8 — verify Docker available"
docker info > /dev/null || { echo "ERROR: Docker not running"; exit 1; }

echo "==> 4/8 — clone/update bahmni-docker"
if [ ! -d "$BAHMNI_DIR" ]; then
  git clone --depth 1 "$BAHMNI_REPO" "$BAHMNI_DIR"
else
  (cd "$BAHMNI_DIR" && git pull)
fi

echo "==> 5/8 — overlay bsh-bahmni-config"
mkdir -p "$BAHMNI_DIR/config-bsh"
cp -r bahmni-config/* "$BAHMNI_DIR/config-bsh/"

echo "==> 6/8 — write .env from BSH defaults"
ENVFILE="$BAHMNI_DIR/$BAHMNI_FLAVOR/.env"
cat > "$ENVFILE" <<EOF
BAHMNI_VERSION=1.0.0
BAHMNI_CONFIG_PATH=$BAHMNI_DIR/config-bsh
SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY
TIMEZONE=Asia/Dhaka
EOF
chmod 600 "$ENVFILE"

echo "==> 7/8 — docker compose up -d"
(cd "$BAHMNI_DIR/$BAHMNI_FLAVOR" && docker compose pull && docker compose up -d)

echo "==> 8/8 — wait for healthchecks (max 10 min)"
for i in {1..60}; do
  if curl -fsS http://localhost:8080/openmrs/ws/fhir2/R4/metadata > /dev/null 2>&1; then
    echo "    Bahmni FHIR reachable."
    break
  fi
  sleep 10
done

echo "==> done. Next:"
echo "  1) Apply supabase/migrations/37 + 38 via Supabase Studio"
echo "  2) UPDATE tenant_config SET bahmni_base_url='http://localhost:8080' WHERE tenant_id='${TENANT_ID}'"
echo "  3) Run scripts/seed-bahmni-demo-data.py --tenant ${TENANT_ID}"
echo "  4) Run scripts/activate-bsh-workflows.sh"
echo "  5) Run scripts/bsh-e2e-smoke.sh"
