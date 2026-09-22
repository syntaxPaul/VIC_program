#!/usr/bin/env bash
#
# Sets up the second layer of backup.
#
#   ./deploy/03-backups.sh
#
# Azure already gives you continuous point-in-time restore over a rolling
# window — that is the first layer and it needs no setup. This adds nightly
# pg_dump files to blob storage, which covers the two things PITR does not:
#
#   · restoring a single table or row without rebuilding the whole server
#   · anything older than the PITR window, which the NPO Act's five-year
#     record-keeping requirement will eventually exceed

cd "$(dirname "$0")/.." || exit 1
source deploy/config.sh
require_az

[[ -f deploy/.env.azure ]] || die "deploy/.env.azure is missing. Run ./deploy/01-provision.sh first."
set -a; source deploy/.env.azure; set +a

RETENTION_DAYS="${RETENTION_DAYS:-400}"   # comfortably over a year
TOOLS_IMAGE="${ACR_NAME}.azurecr.io/${IMAGE_NAME}-tools:latest"

bold "Nightly database dumps to blob storage"

# The dump and upload live in scripts/backup.mts, which runs from the
# tools image (it has pg_dump 17 and the Azure SDK).

if az containerapp job show --name "$BACKUP_JOB" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  az containerapp job update --name "$BACKUP_JOB" --resource-group "$RESOURCE_GROUP" \
    --image "$TOOLS_IMAGE" --output none
  ok "updated the backup job"
else
  az containerapp job create \
    --name "$BACKUP_JOB" --resource-group "$RESOURCE_GROUP" --environment "$ENV_NAME" \
    --trigger-type Schedule \
    --cron-expression "0 1 * * *" \
    --replica-timeout 1800 --replica-retry-limit 1 \
    --replica-completion-count 1 --parallelism 1 \
    --image "$TOOLS_IMAGE" \
    --registry-server "${ACR_NAME}.azurecr.io" \
    --registry-identity "$IDENTITY_ID" \
    --mi-user-assigned "$IDENTITY_ID" \
    --cpu 0.5 --memory 1.0Gi \
    --command "/usr/local/bin/run-backup" \
    --secrets "db-url=$DATABASE_URL" \
    --env-vars \
      "DATABASE_URL=secretref:db-url" \
      "AZURE_STORAGE_ACCOUNT_NAME=$STORAGE_ACCOUNT" \
      "BACKUP_CONTAINER=$BACKUP_CONTAINER" \
      "AZURE_CLIENT_ID=$IDENTITY_CLIENT_ID" \
    --output none
  ok "created the backup job (01:00 UTC = 03:00 SAST, nightly)"
fi

# Delete dumps automatically once they are older than the retention window.
cat > /tmp/lifecycle.json <<EOF
{
  "rules": [{
    "enabled": true,
    "name": "expire-old-database-dumps",
    "type": "Lifecycle",
    "definition": {
      "actions": { "baseBlob": { "delete": { "daysAfterModificationGreaterThan": $RETENTION_DAYS } } },
      "filters": { "blobTypes": ["blockBlob"], "prefixMatch": ["${BACKUP_CONTAINER}/db/"] }
    }
  }]
}
EOF
az storage account management-policy create \
  --account-name "$STORAGE_ACCOUNT" --resource-group "$RESOURCE_GROUP" \
  --policy @/tmp/lifecycle.json --output none 2>/dev/null \
  && ok "dumps older than $RETENTION_DAYS days are deleted automatically" \
  || warn "could not set the retention policy — set it in the portal under Storage → Lifecycle management"
rm -f /tmp/lifecycle.json

echo
bold "Backups configured."
info "Layer 1  Azure point-in-time restore, ${PG_BACKUP_RETENTION_DAYS:-35} days, already running"
info "Layer 2  nightly pg_dump to ${STORAGE_ACCOUNT}/${BACKUP_CONTAINER}/db/"
echo
warn "A backup you have never restored is not a backup."
info "Run ./deploy/04-restore-drill.sh to prove it works. Do this now, not later."
