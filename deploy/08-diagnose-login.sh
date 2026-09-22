#!/usr/bin/env bash
#
# Works out why a correct-looking email and password are rejected.
#
#   ./deploy/08-diagnose-login.sh
#
# The usual cause is that the running app and the job that loaded the data
# are pointed at different databases, so the accounts exist — just not where
# the app is looking.

cd "$(dirname "$0")/.." || exit 1
source deploy/config.sh
require_az

[[ -f deploy/.env.azure ]] || die "deploy/.env.azure is missing."
set -a; source deploy/.env.azure; set +a

bold "Why sign-in is failing"
echo

# --- 1. what is the app actually configured with? ---------------------
bold "1/4  The running app's configuration"

APP_ENV=$(az containerapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" \
  --query "properties.template.containers[0].env" -o json 2>/dev/null) || die "Could not read $APP_NAME."

DB_REF=$(echo "$APP_ENV" | python3 -c "
import json,sys
for e in json.load(sys.stdin) or []:
    if e.get('name') == 'DATABASE_URL':
        print(e.get('secretRef') or e.get('value') or ''); break
" 2>/dev/null)

[[ -n "$DB_REF" ]] || die "The app has no DATABASE_URL set at all."
info "DATABASE_URL comes from secret: $DB_REF"

APP_DB=$(az containerapp secret list --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" \
  --show-values --query "[?name=='$DB_REF'].value" -o tsv 2>/dev/null)

[[ -n "$APP_DB" ]] || die "The secret '$DB_REF' does not exist on the app."

mask() { echo "$1" | sed -E 's#://([^:]+):[^@]+@#://\1:***@#'; }
info "app  : $(mask "$APP_DB")"
info "setup: $(mask "$DATABASE_URL")"

# --- 2. do they match? ------------------------------------------------
bold "2/4  Are they the same database?"
strip() { echo "$1" | sed -E 's#://([^:]+):[^@]+@#://\1@#; s#\?.*##'; }
if [[ "$(strip "$APP_DB")" == "$(strip "$DATABASE_URL")" ]]; then
  ok "same server and database"
  SAME=1
else
  warn "DIFFERENT — this is the problem"
  info "The accounts were created where the setup job pointed, and the app is"
  info "reading somewhere else."
  SAME=0
fi

if [[ "${APP_DB}" != "${DATABASE_URL}" && "$SAME" == "1" ]]; then
  warn "the password or connection options differ, even though the database matches"
fi

# --- 3. look in the app's own database --------------------------------
bold "3/4  What is in the database the app reads?"
JOB="${APP_NAME}-doctor"
TOOLS_IMAGE="${ACR_NAME}.azurecr.io/${IMAGE_NAME}-tools:latest"

az containerapp job delete --name "$JOB" --resource-group "$RESOURCE_GROUP" --yes --output none 2>/dev/null || true
az containerapp job create \
  --name "$JOB" --resource-group "$RESOURCE_GROUP" --environment "$ENV_NAME" \
  --trigger-type Manual --replica-timeout 600 --replica-retry-limit 0 \
  --replica-completion-count 1 --parallelism 1 \
  --image "$TOOLS_IMAGE" \
  --registry-server "${ACR_NAME}.azurecr.io" \
  --registry-identity "$IDENTITY_ID" --mi-user-assigned "$IDENTITY_ID" \
  --cpu 0.5 --memory 1.0Gi \
  --command "/usr/local/bin/run-doctor" \
  --secrets "db-url=$APP_DB" \
  --env-vars "DATABASE_URL=secretref:db-url" "TEST_EMAIL=${TEST_EMAIL:-admin@vic.org}" "TEST_PASSWORD=${TEST_PASSWORD:-vic2026}" \
  --output none

EXEC=$(az containerapp job start --name "$JOB" --resource-group "$RESOURCE_GROUP" --query name -o tsv)
for _ in $(seq 1 60); do
  ST=$(az containerapp job execution show --name "$JOB" --resource-group "$RESOURCE_GROUP" \
    --job-execution-name "$EXEC" --query properties.status -o tsv 2>/dev/null || echo "Running")
  [[ "$ST" == "Running" || "$ST" == "Processing" ]] || break
  sleep 5
done
echo
az containerapp job logs show --name "$JOB" --resource-group "$RESOURCE_GROUP" \
  --container "$JOB" --tail 40 2>/dev/null \
  | sed -E 's/.*"Log":"F? ?//; s/"\}$//' \
  | grep -vE "SECURITY WARNING|In the next|To prepare|^- If you|See https|Warning:|trace-warnings|^\s*$" \
  | sed 's/^/    /'
echo
az containerapp job delete --name "$JOB" --resource-group "$RESOURCE_GROUP" --yes --output none 2>/dev/null || true

# --- 4. what to do ----------------------------------------------------
bold "4/4  What to do"
if [[ "$SAME" == "0" ]]; then
  info "Point the app at the same database and restart it:"
  echo
  echo "    az containerapp secret set -n $APP_NAME -g $RESOURCE_GROUP \\"
  echo "      --secrets \"db-url=\$DATABASE_URL\""
  echo "    az containerapp update -n $APP_NAME -g $RESOURCE_GROUP \\"
  echo "      --set-env-vars DATABASE_URL=secretref:db-url"
  echo
  info "Or re-run ./deploy/07-setup-data.sh --demo, which loads the data where"
  info "deploy/.env.azure points."
else
  info "If the accounts are listed above and the password verifies, the app is"
  info "reading the right data — try the sign-in again, watching for a stray"
  info "space from autofill. If they are NOT listed, load the data:"
  echo
  echo "    ./deploy/07-setup-data.sh --demo"
fi
