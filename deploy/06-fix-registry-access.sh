#!/usr/bin/env bash
#
# Diagnoses and repairs Container Apps being unable to pull from the registry.
#
#   ./deploy/06-fix-registry-access.sh
#
# Run this when deployment reports something like
#   Field 'template.containers...image' is invalid ...
#   Get "https://<registry>.azurecr.io/v2/": dial tcp ...: connection refused

cd "$(dirname "$0")/.." || exit 1
source deploy/config.sh
require_az

[[ -f deploy/.env.azure ]] || die "deploy/.env.azure is missing. Run ./deploy/01-provision.sh first."
set -a; source deploy/.env.azure; set +a

SUBSCRIPTION=$(az account show --query id -o tsv)
LOGIN_SERVER="${ACR_NAME}.azurecr.io"

bold "Container registry access"
info "Registry: $LOGIN_SERVER"
echo

# --- 1. registry state -------------------------------------------------
bold "1/6  Registry configuration"
INFO=$(az acr show --name "$ACR_NAME" \
  --query "{state:provisioningState, sku:sku.name, public:publicNetworkAccess, action:networkRuleSet.defaultAction, trusted:networkRuleBypassOptions}" \
  -o tsv 2>/dev/null) || die "Could not read registry $ACR_NAME."

read -r STATE SKU PUBLIC ACTION TRUSTED <<<"$INFO"
info "provisioning        : $STATE"
info "sku                 : $SKU"
info "public access       : ${PUBLIC:-Enabled}"
info "network default     : ${ACTION:-none (Basic has no network rules)}"
info "trusted services    : ${TRUSTED:-AzureServices}"

if [[ "${PUBLIC:-Enabled}" == "Disabled" ]]; then
  warn "public network access is disabled — Container Apps cannot reach it"
  az acr update --name "$ACR_NAME" --public-network-enabled true --output none \
    && ok "re-enabled public access" \
    || warn "could not re-enable it (Basic SKU may not support the flag)"
fi

if [[ "${TRUSTED:-AzureServices}" != "AzureServices" ]]; then
  warn "trusted Azure services are not allowed to bypass network rules"
  az acr update --name "$ACR_NAME" --allow-trusted-services true --output none \
    && ok "allowed trusted services" \
    || warn "could not change it"
fi

# --- 2. ARM audience tokens -------------------------------------------
bold "2/6  Managed-identity authentication"
ARM_STATUS=$(az acr config authentication-as-arm show -r "$ACR_NAME" --query status -o tsv 2>/dev/null || echo "unknown")
if [[ "$ARM_STATUS" == "disabled" ]]; then
  warn "ARM audience tokens are disabled, which breaks managed-identity pull"
  az acr config authentication-as-arm update -r "$ACR_NAME" --status enabled --output none \
    && ok "enabled" || warn "could not enable (a subscription policy may forbid it)"
else
  ok "ARM audience tokens: $ARM_STATUS"
fi

# --- 3. the image actually exists -------------------------------------
bold "3/6  Is the image there?"
TAGS=$(az acr repository show-tags --name "$ACR_NAME" --repository "$IMAGE_NAME" \
  --orderby time_desc --top 3 -o tsv 2>/dev/null || echo "")
if [[ -n "$TAGS" ]]; then
  ok "latest tags: $(echo "$TAGS" | tr '\n' ' ')"
else
  warn "no tags found for '$IMAGE_NAME' — the build may not have pushed"
fi

# --- 4. the identity may pull -----------------------------------------
bold "4/6  Pull permission"
IDENTITY_PRINCIPAL_ID=$(az identity show -n "$IDENTITY_NAME" -g "$RESOURCE_GROUP" --query principalId -o tsv 2>/dev/null)
SCOPE="/subscriptions/$SUBSCRIPTION/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.ContainerRegistry/registries/$ACR_NAME"

if az role assignment list --assignee "$IDENTITY_PRINCIPAL_ID" --scope "$SCOPE" \
     --query "[?roleDefinitionName=='AcrPull'] | length(@)" -o tsv 2>/dev/null | grep -q "^[1-9]"; then
  ok "the managed identity has AcrPull"
else
  info "granting AcrPull…"
  az role assignment create --assignee-object-id "$IDENTITY_PRINCIPAL_ID" \
    --assignee-principal-type ServicePrincipal --role AcrPull --scope "$SCOPE" --output none \
    && ok "granted" || warn "could not grant it"
fi

# --- 5. reachability ---------------------------------------------------
bold "5/6  Reachability from this machine"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 20 "https://${LOGIN_SERVER}/v2/" 2>/dev/null || echo "000")
case "$CODE" in
  401|200) ok "the registry endpoint answers (HTTP $CODE — 401 is normal, it wants a token)" ;;
  000)     warn "no response at all. Either the registry endpoint is having trouble, or this network blocks it." ;;
  *)       warn "unexpected HTTP $CODE" ;;
esac

# --- 6. retry the pull -------------------------------------------------
bold "6/6  Asking Container Apps to try again"
info "The original error was a TCP connection refusal from Azure's side rather"
info "than an authentication failure, which is often transient. Retrying…"
echo

TAG=$(echo "$TAGS" | head -1)
[[ -z "$TAG" ]] && die "No image tag to deploy. Run ./deploy/02-deploy.sh to build one."
IMAGE="${LOGIN_SERVER}/${IMAGE_NAME}:${TAG}"

IDENTITY_ID=$(az identity show -n "$IDENTITY_NAME" -g "$RESOURCE_GROUP" --query id -o tsv)
IDENTITY_CLIENT_ID=$(az identity show -n "$IDENTITY_NAME" -g "$RESOURCE_GROUP" --query clientId -o tsv)

for attempt in 1 2 3; do
  info "attempt $attempt of 3 with $IMAGE"
  if az containerapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
    az containerapp update --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" \
      --image "$IMAGE" --output none 2>/tmp/ca-err.log && { ok "deployed"; break; }
  else
    az containerapp create \
      --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --environment "$ENV_NAME" \
      --image "$IMAGE" \
      --registry-server "$LOGIN_SERVER" \
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
      --output none 2>/tmp/ca-err.log && { ok "deployed"; break; }
  fi

  if [[ $attempt -lt 3 ]]; then
    warn "failed; waiting 60s before retrying"
    tail -2 /tmp/ca-err.log 2>/dev/null | sed 's/^/    /'
    sleep 60
  else
    echo; tail -5 /tmp/ca-err.log 2>/dev/null | sed 's/^/    /'
    die "Still failing after 3 attempts. If the error is still 'connection refused',
   this is an Azure-side problem reaching the registry rather than anything in
   your configuration. Wait a few minutes and run this script again."
  fi
done

FQDN=$(az containerapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv 2>/dev/null)
echo
[[ -n "$FQDN" ]] && bold "Live at https://${FQDN}" || warn "deployed, but no ingress hostname yet"
