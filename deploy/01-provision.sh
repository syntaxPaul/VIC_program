#!/usr/bin/env bash
#
# Creates every Azure resource the church app needs, in South Africa North.
#
#   ./deploy/01-provision.sh
#
# Safe to re-run: every step checks whether the resource already exists.
# Nothing here deploys code — that is 02-deploy.sh.

cd "$(dirname "$0")/.." || exit 1
source deploy/config.sh

require_az

SUBSCRIPTION=$(az account show --query id -o tsv)
SUB_NAME=$(az account show --query name -o tsv)

bold "Provisioning Victory in Christ church management"
info "Subscription : $SUB_NAME"
info "Region       : $LOCATION"
info "Resource group: $RESOURCE_GROUP"
echo

read -r -p "Continue? [y/N] " reply
[[ "$reply" =~ ^[Yy]$ ]] || die "Cancelled."
echo

# --- extensions and providers ----------------------------------------
bold "1/8  Azure CLI extensions and resource providers"
az extension add --name containerapp --upgrade --only-show-errors >/dev/null 2>&1 || true
for ns in Microsoft.App Microsoft.OperationalInsights Microsoft.DBforPostgreSQL Microsoft.ContainerRegistry Microsoft.Storage; do
  state=$(az provider show --namespace "$ns" --query registrationState -o tsv 2>/dev/null || echo "NotRegistered")
  if [[ "$state" != "Registered" ]]; then
    info "registering $ns (this can take a few minutes)…"
    az provider register --namespace "$ns" --wait
  fi
done
ok "providers registered"

# --- resource group ---------------------------------------------------
bold "2/8  Resource group"
if az group show --name "$RESOURCE_GROUP" >/dev/null 2>&1; then
  ok "$RESOURCE_GROUP already exists"
else
  az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none
  ok "created $RESOURCE_GROUP"
fi

# --- managed identity -------------------------------------------------
# User-assigned rather than system-assigned: it survives the app being
# deleted and recreated, taking its role assignments with it.
bold "3/8  Managed identity"
if az identity show --name "$IDENTITY_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  ok "$IDENTITY_NAME already exists"
else
  az identity create --name "$IDENTITY_NAME" --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" --output none
  ok "created $IDENTITY_NAME"
fi
IDENTITY_ID=$(az identity show -n "$IDENTITY_NAME" -g "$RESOURCE_GROUP" --query id -o tsv)
IDENTITY_CLIENT_ID=$(az identity show -n "$IDENTITY_NAME" -g "$RESOURCE_GROUP" --query clientId -o tsv)
IDENTITY_PRINCIPAL_ID=$(az identity show -n "$IDENTITY_NAME" -g "$RESOURCE_GROUP" --query principalId -o tsv)

# --- container registry ----------------------------------------------
bold "4/8  Container registry"
if az acr show --name "$ACR_NAME" >/dev/null 2>&1; then
  ok "$ACR_NAME already exists"
else
  az acr create --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" \
    --sku Basic --location "$LOCATION" --output none \
    || die "Could not create the registry. '$ACR_NAME' may be taken globally — set ACR_NAME in deploy/config.sh and retry."
  ok "created $ACR_NAME"
fi
# Managed-identity pull needs ARM audience tokens enabled.
az acr config authentication-as-arm update -r "$ACR_NAME" --status enabled --output none 2>/dev/null || true
az role assignment create \
  --assignee-object-id "$IDENTITY_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --role AcrPull \
  --scope "/subscriptions/$SUBSCRIPTION/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.ContainerRegistry/registries/$ACR_NAME" \
  --output none 2>/dev/null || true
ok "identity can pull images"

# --- postgres ---------------------------------------------------------
bold "5/8  PostgreSQL flexible server"
if az postgres flexible-server show --name "$PG_SERVER" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  ok "$PG_SERVER already exists"
  PG_PASSWORD=""
else
  PG_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)Aa1!"
  info "creating $PG_SERVER — this usually takes 3-5 minutes…"
  az postgres flexible-server create \
    --resource-group "$RESOURCE_GROUP" --name "$PG_SERVER" --location "$LOCATION" \
    --admin-user "$PG_ADMIN_USER" --admin-password "$PG_PASSWORD" \
    --tier "$PG_TIER" --sku-name "$PG_SKU" \
    --storage-size "$PG_STORAGE_GB" --storage-auto-grow Enabled \
    --version "$PG_VERSION" \
    --backup-retention "$PG_BACKUP_RETENTION_DAYS" \
    --geo-redundant-backup Disabled \
    --public-access None \
    --yes --output none
  ok "created $PG_SERVER (${PG_BACKUP_RETENTION_DAYS}-day point-in-time restore)"
fi

# The database is created separately: on `flexible-server create`,
# --database-name applies only to elastic clusters.
az postgres flexible-server db create \
  --resource-group "$RESOURCE_GROUP" --server-name "$PG_SERVER" \
  --name "$PG_DATABASE" --output none 2>/dev/null || true
ok "database '$PG_DATABASE' ready"

# Container Apps consumption egress IPs are not stable, so the app is reached
# via the 0.0.0.0-0.0.0.0 sentinel rule, which Azure reads as "allow Azure
# services", rather than via a fixed IP.
#
# This is NOT allowed to fail silently: without it nothing can reach the
# database, and the failure would otherwise only surface later as a
# confusing "P1001: Can't reach database server" from the migration job.
az postgres flexible-server firewall-rule create \
  --resource-group "$RESOURCE_GROUP" --server-name "$PG_SERVER" \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0 --output none \
  || die "Could not create the database firewall rule. Nothing will be able to reach the database until this succeeds."

# Confirm it is really there rather than trusting the exit code.
if az postgres flexible-server firewall-rule list \
     --resource-group "$RESOURCE_GROUP" --server-name "$PG_SERVER" \
     --query "[?startIpAddress=='0.0.0.0' && endIpAddress=='0.0.0.0'] | length(@)" -o tsv 2>/dev/null \
     | grep -q "^[1-9]"; then
  ok "Azure services may reach the database (rule verified)"
else
  die "The firewall rule was not created. Run ./deploy/05-fix-database-access.sh to diagnose."
fi

# --- storage ----------------------------------------------------------
bold "6/8  Storage account for photos and backups"
if az storage account show --name "$STORAGE_ACCOUNT" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  ok "$STORAGE_ACCOUNT already exists"
else
  az storage account create \
    --resource-group "$RESOURCE_GROUP" --name "$STORAGE_ACCOUNT" --location "$LOCATION" \
    --sku Standard_LRS --kind StorageV2 --access-tier Hot \
    --min-tls-version TLS1_2 \
    --allow-blob-public-access false \
    --output none \
    || die "Could not create storage. '$STORAGE_ACCOUNT' may be taken globally — set STORAGE_ACCOUNT in deploy/config.sh and retry."
  ok "created $STORAGE_ACCOUNT"
fi

az role assignment create \
  --assignee-object-id "$IDENTITY_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT" \
  --output none 2>/dev/null || true

# Grant the person running this script data access too, so container
# creation below works and so they can inspect blobs later.
MY_ID=$(az ad signed-in-user show --query id -o tsv 2>/dev/null || echo "")
if [[ -n "$MY_ID" ]]; then
  az role assignment create --assignee-object-id "$MY_ID" --assignee-principal-type User \
    --role "Storage Blob Data Contributor" \
    --scope "/subscriptions/$SUBSCRIPTION/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT" \
    --output none 2>/dev/null || true
fi

info "waiting for role assignments to propagate…"
sleep 30

for container in "$BLOB_CONTAINER" "$BACKUP_CONTAINER"; do
  az storage container create --name "$container" --account-name "$STORAGE_ACCOUNT" \
    --auth-mode login --public-access off --output none 2>/dev/null \
    || warn "could not create container '$container' yet — RBAC can take a few minutes; re-run this script if photos fail later"
done
ok "blob containers ready"

# --- container apps environment --------------------------------------
bold "7/8  Container Apps environment"
if az containerapp env show --name "$ENV_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  ok "$ENV_NAME already exists"
else
  info "creating $ENV_NAME — this takes a few minutes…"
  az containerapp env create \
    --name "$ENV_NAME" --resource-group "$RESOURCE_GROUP" --location "$LOCATION" \
    --output none
  ok "created $ENV_NAME"
fi

# --- write the local settings file ------------------------------------
bold "8/8  Saving settings"
PG_HOST="${PG_SERVER}.postgres.database.azure.com"

if [[ -n "$PG_PASSWORD" ]]; then
  cat > deploy/.env.azure <<EOF
# Generated by 01-provision.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ)
# CONTAINS THE DATABASE PASSWORD — never commit this file.
RESOURCE_GROUP=$RESOURCE_GROUP
LOCATION=$LOCATION
ACR_NAME=$ACR_NAME
STORAGE_ACCOUNT=$STORAGE_ACCOUNT
PG_SERVER=$PG_SERVER
PG_HOST=$PG_HOST
PG_ADMIN_USER=$PG_ADMIN_USER
PG_PASSWORD=$PG_PASSWORD
PG_DATABASE=$PG_DATABASE
IDENTITY_ID=$IDENTITY_ID
IDENTITY_CLIENT_ID=$IDENTITY_CLIENT_ID
DATABASE_URL=postgresql://$PG_ADMIN_USER:$PG_PASSWORD@$PG_HOST:5432/$PG_DATABASE?sslmode=require
AUTH_SECRET=$(openssl rand -base64 32)
EOF
  chmod 600 deploy/.env.azure
  ok "wrote deploy/.env.azure (contains secrets, gitignored)"
else
  warn "the database already existed, so its password is not in deploy/.env.azure"
  warn "if you have lost it: az postgres flexible-server update -g $RESOURCE_GROUP -n $PG_SERVER --admin-password '<new>'"
fi

echo
bold "Provisioned."
info "Next: ./deploy/02-deploy.sh"
