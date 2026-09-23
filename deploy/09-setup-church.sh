#!/usr/bin/env bash
#
# Hands the system over to the church.
#
# Clears the demonstration records — members, money, assets, events, baptisms,
# notes — and keeps what is real: the chart of accounts, the funds, the
# church's own settings, and every membership form that came in through the
# public link. Then creates one account per office.
#
# The six passwords are read from the environment and are never written to a
# file in this repository:
#
#   ADMIN_PASSWORD=... PASTOR_PASSWORD=... DISCIPLESHIP_PASSWORD=... \
#   EVANGELIST_PASSWORD=... TREASURER_PASSWORD=... SECRETARY_PASSWORD=... \
#   ./deploy/09-setup-church.sh
#
# Names and emails can be overridden the same way, e.g. PASTOR_NAME="Ps. S Dube"
# PASTOR_EMAIL="pastor@victoryinchrist.org.za".

cd "$(dirname "$0")/.." || exit 1
source deploy/config.sh
require_az

[[ -f deploy/.env.azure ]] || die "deploy/.env.azure is missing. Run ./deploy/01-provision.sh first."
set -a; source deploy/.env.azure; set +a

OFFICES=(ADMIN PASTOR DISCIPLESHIP EVANGELIST TREASURER SECRETARY)

for o in "${OFFICES[@]}"; do
  var="${o}_PASSWORD"
  [[ -n "${!var:-}" ]] || die "$var is not set. See the comment at the top of this script."
done

bold "Handing the system over to the church"
warn "This DELETES every demonstration record: members, offerings, expenses,"
warn "assets, events, baptisms and notes. Membership forms received through"
warn "the public link are kept, and so are the funds and chart of accounts."
echo
read -r -p "Continue? [y/N] " reply
[[ "$reply" =~ ^[Yy]$ ]] || die "Cancelled."

JOB="${APP_NAME}-setup"
TOOLS_IMAGE="${ACR_NAME}.azurecr.io/${IMAGE_NAME}-tools:latest"

JOB_SECRETS=("db-url=$DATABASE_URL")
JOB_ENV=("DATABASE_URL=secretref:db-url" "CONFIRM=1")

for o in "${OFFICES[@]}"; do
  lower=$(echo "$o" | tr '[:upper:]' '[:lower:]')
  pass_var="${o}_PASSWORD"
  JOB_SECRETS+=("pw-${lower}=${!pass_var}")
  JOB_ENV+=("${o}_PASSWORD=secretref:pw-${lower}")

  name_var="${o}_NAME"; email_var="${o}_EMAIL"
  [[ -n "${!name_var:-}" ]] && JOB_ENV+=("${o}_NAME=${!name_var}")
  [[ -n "${!email_var:-}" ]] && JOB_ENV+=("${o}_EMAIL=${!email_var}")
done

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
  --command "/usr/local/bin/run-setup-church" \
  --secrets "${JOB_SECRETS[@]}" \
  --env-vars "${JOB_ENV[@]}" \
  --output none

execution=$(az containerapp job start --name "$JOB" --resource-group "$RESOURCE_GROUP" --query name -o tsv)

info "running…"
status="Running"
for _ in $(seq 1 120); do
  status=$(az containerapp job execution show \
    --name "$JOB" --resource-group "$RESOURCE_GROUP" \
    --job-execution-name "$execution" --query properties.status -o tsv 2>/dev/null || echo "Running")
  [[ "$status" == "Running" || "$status" == "Processing" ]] || break
  sleep 5
done

echo
az containerapp job logs show --name "$JOB" --resource-group "$RESOURCE_GROUP" \
  --container "$JOB" --tail 60 2>/dev/null \
  | sed -E 's/.*"Log":"F? ?//; s/"\}$//' | sed 's/^/    /' || true
echo

az containerapp job delete --name "$JOB" --resource-group "$RESOURCE_GROUP" --yes --output none 2>/dev/null || true

[[ "$status" == "Succeeded" ]] || die "The job ended as '$status'. See the output above."

ok "The church's system is ready."
info "Everyone should change their password after signing in for the first time."
