#!/usr/bin/env bash
#
# Builds the image in Azure, runs database migrations as a separate job,
# then rolls the app forward.
#
#   ./deploy/02-deploy.sh
#
# Migrations run as their own job rather than at container start, so that a
# failed migration fails loudly and leaves the previous version serving,
# instead of putting the app into a crash loop.

cd "$(dirname "$0")/.." || exit 1
source deploy/config.sh
require_az

[[ -f deploy/.env.azure ]] || die "deploy/.env.azure is missing. Run ./deploy/01-provision.sh first."
set -a; source deploy/.env.azure; set +a

TAG="$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)"
IMAGE="${ACR_NAME}.azurecr.io/${IMAGE_NAME}:${TAG}"
TOOLS_IMAGE="${ACR_NAME}.azurecr.io/${IMAGE_NAME}-tools:${TAG}"

bold "Deploying $IMAGE"

# --- build in Azure ---------------------------------------------------
# Building in ACR rather than locally means no Docker on your machine and,
# more importantly, always produces linux/amd64 — Container Apps rejects the
# arm64 image an Apple Silicon Mac would otherwise build.
bold "1/4  Building the images in Azure"
az acr build \
  --registry "$ACR_NAME" \
  --image "${IMAGE_NAME}:${TAG}" \
  --image "${IMAGE_NAME}:latest" \
  --file Dockerfile \
  --platform linux/amd64 \
  . >/dev/null
ok "built ${IMAGE_NAME}:${TAG}"

# The application image uses Next.js standalone output, which prunes
# node_modules and so contains neither the Prisma CLI nor pg_dump.
# Migrations and backups run from this second image instead.
az acr build \
  --registry "$ACR_NAME" \
  --image "${IMAGE_NAME}-tools:${TAG}" \
  --image "${IMAGE_NAME}-tools:latest" \
  --file Dockerfile.tools \
  --platform linux/amd64 \
  . >/dev/null
ok "built ${IMAGE_NAME}-tools:${TAG}"

# --- migrations -------------------------------------------------------
bold "2/4  Database migrations"
if ! az containerapp job show --name "$MIGRATE_JOB" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  az containerapp job create \
    --name "$MIGRATE_JOB" --resource-group "$RESOURCE_GROUP" --environment "$ENV_NAME" \
    --trigger-type Manual \
    --replica-timeout 900 --replica-retry-limit 0 \
    --replica-completion-count 1 --parallelism 1 \
    --image "$TOOLS_IMAGE" \
    --registry-server "${ACR_NAME}.azurecr.io" \
    --registry-identity "$IDENTITY_ID" \
    --mi-user-assigned "$IDENTITY_ID" \
    --cpu 0.5 --memory 1.0Gi \
    --command "/usr/local/bin/run-migrate" \
    --secrets "db-url=$DATABASE_URL" \
    --env-vars "DATABASE_URL=secretref:db-url" \
    --output none
  ok "created migration job"
else
  az containerapp job update \
    --name "$MIGRATE_JOB" --resource-group "$RESOURCE_GROUP" \
    --image "$TOOLS_IMAGE" --output none
  az containerapp job secret set \
    --name "$MIGRATE_JOB" --resource-group "$RESOURCE_GROUP" \
    --secrets "db-url=$DATABASE_URL" --output none 2>/dev/null || true
  ok "updated migration job"
fi

info "running migrations…"
EXECUTION=$(az containerapp job start --name "$MIGRATE_JOB" --resource-group "$RESOURCE_GROUP" \
  --query name -o tsv)

for _ in $(seq 1 60); do
  STATUS=$(az containerapp job execution show \
    --name "$MIGRATE_JOB" --resource-group "$RESOURCE_GROUP" \
    --job-execution-name "$EXECUTION" --query properties.status -o tsv 2>/dev/null || echo "Running")
  [[ "$STATUS" == "Running" || "$STATUS" == "Processing" ]] || break
  sleep 5
done

if [[ "$STATUS" != "Succeeded" ]]; then
  warn "migration job status: $STATUS"
  echo
  az containerapp job logs show --name "$MIGRATE_JOB" --resource-group "$RESOURCE_GROUP" \
    --container "$MIGRATE_JOB" --tail 50 2>/dev/null || true
  die "Migrations failed. The previous version is still serving — nothing was rolled forward."
fi
ok "migrations applied"

# --- the app ----------------------------------------------------------
bold "3/4  Rolling the app forward"

# Container Apps occasionally fails to reach the registry with a TCP
# "connection refused" from Azure's own side. It is transient and unrelated
# to configuration, so each attempt is retried before giving up.
deploy_attempt() {
  local n=$1
  if [[ $n -gt 1 ]]; then
    warn "attempt $n of 3"
  fi
}

if az containerapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  for attempt in 1 2 3; do
    deploy_attempt "$attempt"
    az containerapp update \
      --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" \
      --image "$IMAGE" --output none 2>/tmp/vic-deploy-err.log && break
    [[ $attempt -eq 3 ]] && {
      tail -4 /tmp/vic-deploy-err.log | sed 's/^/    /'
      die "Could not roll the app forward. If the error mentions 'connection refused'
   reaching the registry, run ./deploy/06-fix-registry-access.sh"
    }
    sleep 45
  done
  ok "updated to ${IMAGE_NAME}:${TAG}"
else
  for attempt in 1 2 3; do
  deploy_attempt "$attempt"
  az containerapp create \
    --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --environment "$ENV_NAME" \
    --image "$IMAGE" \
    --registry-server "${ACR_NAME}.azurecr.io" \
    --registry-identity "$IDENTITY_ID" \
    --user-assigned "$IDENTITY_ID" \
    --target-port 3000 --ingress external --transport auto \
    --cpu "$APP_CPU" --memory "$APP_MEMORY" \
    --min-replicas "$APP_MIN_REPLICAS" --max-replicas "$APP_MAX_REPLICAS" \
    --scale-rule-name http-rule --scale-rule-type http \
    --scale-rule-http-concurrency 50 \
    --secrets "db-url=$DATABASE_URL" "auth-secret=$AUTH_SECRET" \
    --env-vars \
      "DATABASE_URL=secretref:db-url" \
      "AUTH_SECRET=secretref:auth-secret" \
      "AZURE_STORAGE_ACCOUNT_NAME=$STORAGE_ACCOUNT" \
      "AZURE_STORAGE_CONTAINER=$BLOB_CONTAINER" \
      "AZURE_CLIENT_ID=$IDENTITY_CLIENT_ID" \
      "NODE_ENV=production" \
    --output none 2>/tmp/vic-deploy-err.log && break
    [[ $attempt -eq 3 ]] && {
      tail -4 /tmp/vic-deploy-err.log | sed 's/^/    /'
      die "Could not create the app. If the error mentions 'connection refused'
   reaching the registry, run ./deploy/06-fix-registry-access.sh"
    }
    sleep 45
  done
  ok "created $APP_NAME"
fi

# Applied every run so config drift cannot accumulate silently.
az containerapp update --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" \
  --set-env-vars \
    "AZURE_STORAGE_ACCOUNT_NAME=$STORAGE_ACCOUNT" \
    "AZURE_STORAGE_CONTAINER=$BLOB_CONTAINER" \
    "AZURE_CLIENT_ID=$IDENTITY_CLIENT_ID" \
    "NODE_ENV=production" \
  --output none

# --- verify -----------------------------------------------------------
bold "4/4  Checking it answers"
FQDN=$(az containerapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)
URL="https://${FQDN}"

for i in $(seq 1 24); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 20 "${URL}/api/health" || echo "000")
  [[ "$CODE" == "200" ]] && break
  sleep 5
done

echo
if [[ "$CODE" == "200" ]]; then
  ok "healthy"
  bold "Live at ${URL}"
  if [[ "$APP_MIN_REPLICAS" == "0" ]]; then
    info "Scales to zero when idle, so the first request after a quiet spell takes a few seconds."
  else
    info "One replica stays running, so it answers immediately."
  fi
else
  warn "health check returned $CODE"
  info "Logs: az containerapp logs show -n $APP_NAME -g $RESOURCE_GROUP --tail 60 --follow"
fi
