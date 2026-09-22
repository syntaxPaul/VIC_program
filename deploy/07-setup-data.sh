#!/usr/bin/env bash
#
# Puts data into the deployed database. Migrations create the schema and
# nothing else, so a freshly deployed system has no accounts to sign in with
# and no chart of accounts to record against.
#
#   ./deploy/07-setup-data.sh --demo    load demo data to look around
#   ./deploy/07-setup-data.sh           go live: the church's real system
#
# Runs inside Azure as a one-off job using the tools image, so nothing needs
# to be installed on this machine.

cd "$(dirname "$0")/.." || exit 1
source deploy/config.sh
require_az

[[ -f deploy/.env.azure ]] || die "deploy/.env.azure is missing. Run ./deploy/01-provision.sh first."
set -a; source deploy/.env.azure; set +a

MODE="golive"
[[ "${1:-}" == "--demo" ]] && MODE="demo"

JOB="${APP_NAME}-setup"
TOOLS_IMAGE="${ACR_NAME}.azurecr.io/${IMAGE_NAME}-tools:latest"

# JOB_SECRETS and JOB_ENV are set by the caller and are never empty.
# An empty array expanded under `set -u` is an unbound variable on bash 3.2,
# which is what macOS ships, so neither is allowed to be empty.
run_job() {
  local cmd="$1"

  az containerapp job delete --name "$JOB" --resource-group "$RESOURCE_GROUP" --yes --output none 2>/dev/null || true

  az containerapp job create \
    --name "$JOB" --resource-group "$RESOURCE_GROUP" --environment "$ENV_NAME" \
    --trigger-type Manual \
    --replica-timeout 1800 --replica-retry-limit 0 \
    --replica-completion-count 1 --parallelism 1 \
    --image "$TOOLS_IMAGE" \
    --registry-server "${ACR_NAME}.azurecr.io" \
    --registry-identity "$IDENTITY_ID" \
    --mi-user-assigned "$IDENTITY_ID" \
    --cpu 0.5 --memory 1.0Gi \
    --command "$cmd" \
    --secrets "${JOB_SECRETS[@]}" \
    --env-vars "${JOB_ENV[@]}" \
    --output none

  local execution
  execution=$(az containerapp job start --name "$JOB" --resource-group "$RESOURCE_GROUP" \
    --query name -o tsv)

  info "running…"
  local status="Running"
  for _ in $(seq 1 120); do
    status=$(az containerapp job execution show \
      --name "$JOB" --resource-group "$RESOURCE_GROUP" \
      --job-execution-name "$execution" --query properties.status -o tsv 2>/dev/null || echo "Running")
    [[ "$status" == "Running" || "$status" == "Processing" ]] || break
    sleep 5
  done

  echo
  az containerapp job logs show --name "$JOB" --resource-group "$RESOURCE_GROUP" \
    --container "$JOB" --tail 40 2>/dev/null \
    | sed -E 's/.*"Log":"F? ?//; s/"\}$//' | sed 's/^/    /' || true
  echo

  az containerapp job delete --name "$JOB" --resource-group "$RESOURCE_GROUP" --yes --output none 2>/dev/null || true

  [[ "$status" == "Succeeded" ]] || die "The job ended as '$status'. See the output above."
}

if [[ "$MODE" == "demo" ]]; then
  bold "Loading demo data"
  warn "This REPLACES everything currently in the database with invented records."
  read -r -p "Continue? [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]] || die "Cancelled."

  JOB_SECRETS=("db-url=$DATABASE_URL")
  JOB_ENV=("DATABASE_URL=secretref:db-url")
  run_job "/usr/local/bin/run-seed"

  ok "Demo data loaded."
  info "Sign in as admin@vic.org with the password vic2026"
  warn "Run this again without --demo before the church uses it for real."
  exit 0
fi

# ── going live ─────────────────────────────────────────────────────────
bold "Going live"
info "This sets up the church's real system: its details, its funds and"
info "chart of accounts, and one administrator account."
echo

ask()  { local a; read -r -p "$1 ${2:+[$2] }" a; echo "${a:-$2}"; }
askq() { local a; read -r -p "$1 " a; while [[ -z "$a" ]]; do read -r -p "  Required. $1 " a; done; echo "$a"; }

CHURCH_NAME=$(ask "Church name:" "Victory in Christ")
BRANCH_NAME=$(ask "Branch (blank if none):")
ADDRESS=$(ask "Street address:")
CITY=$(ask "City / township:")
PROVINCE=$(ask "Province:" "Gauteng")
POSTAL_CODE=$(ask "Postal code:")
PHONE=$(ask "Phone:")
OFFICE_EMAIL=$(ask "Office email:")

echo
info "Registration — leave blank for anything the church does NOT hold."
NPO_NUMBER=$(ask "NPO number:")
PBO_NUMBER=$(ask "PBO number:")
echo "  Section 18A is separate from PBO status. Ordinary tithes and offerings"
echo "  are generally NOT 18A deductible. Leave blank unless SARS has granted it."
SECTION_18A_NUMBER=$(ask "Section 18A reference:")

echo
FY_START_MONTH=$(ask "Financial year starts in month (1-12):" "3")

echo
bold "Administrator"
ADMIN_NAME=$(askq "Full name:")
ADMIN_EMAIL=$(askq "Email (used to sign in):")

while :; do
  read -r -s -p "Password (min 10 characters): " ADMIN_PASSWORD; echo
  [[ ${#ADMIN_PASSWORD} -lt 10 ]] && { echo "  Too short."; continue; }
  read -r -s -p "Type it again: " CONFIRM; echo
  [[ "$ADMIN_PASSWORD" == "$CONFIRM" ]] && break
  echo "  Those did not match."
done

echo
warn "This deletes any existing data in the database."
read -r -p 'Type "GO LIVE" to continue: ' FINAL
[[ "$FINAL" == "GO LIVE" ]] || die "Cancelled. Nothing was changed."
echo

JOB_ENV=(
  "DATABASE_URL=secretref:db-url"
  "GO_LIVE_CONFIRM=1"
  "ADMIN_PASSWORD=secretref:admin-password"
  "CHURCH_NAME=$CHURCH_NAME"
  "BRANCH_NAME=$BRANCH_NAME"
  "ADDRESS=$ADDRESS"
  "CITY=$CITY"
  "PROVINCE=$PROVINCE"
  "POSTAL_CODE=$POSTAL_CODE"
  "PHONE=$PHONE"
  "OFFICE_EMAIL=$OFFICE_EMAIL"
  "NPO_NUMBER=$NPO_NUMBER"
  "PBO_NUMBER=$PBO_NUMBER"
  "SECTION_18A_NUMBER=$SECTION_18A_NUMBER"
  "FY_START_MONTH=$FY_START_MONTH"
  "ADMIN_NAME=$ADMIN_NAME"
  "ADMIN_EMAIL=$ADMIN_EMAIL"
)

JOB_SECRETS=("db-url=$DATABASE_URL" "admin-password=$ADMIN_PASSWORD")
run_job "/usr/local/bin/run-go-live"

FQDN=$(az containerapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv 2>/dev/null)

bold "The system is live."
info "Sign in at https://${FQDN} as $ADMIN_EMAIL"
echo
info "Next:"
info "  1. Enter the real opening balance for each fund, from the church's records"
info "  2. Add the treasurer, secretary and pastor under Settings → Users"
info "  3. Work through GO-LIVE-CHECKLIST.md with the accounting officer"
