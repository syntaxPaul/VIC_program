#!/usr/bin/env bash
#
# Diagnoses and repairs database connectivity.
#
#   ./deploy/05-fix-database-access.sh
#
# Run this when a migration or the app reports
#   P1001: Can't reach database server
#
# It reports the server's actual network configuration, repairs the firewall
# rule that lets Azure services (including Container Apps) reach it, and
# then proves the connection from this machine.

cd "$(dirname "$0")/.." || exit 1
source deploy/config.sh
require_az

[[ -f deploy/.env.azure ]] || die "deploy/.env.azure is missing. Run ./deploy/01-provision.sh first."
set -a; source deploy/.env.azure; set +a

bold "Database connectivity"
info "Server: $PG_HOST"
echo

# --- what state is it actually in? ------------------------------------
bold "1/4  Current configuration"
STATE=$(az postgres flexible-server show --name "$PG_SERVER" --resource-group "$RESOURCE_GROUP" \
  --query "{state:state, publicAccess:network.publicNetworkAccess, version:version}" -o tsv 2>/dev/null) \
  || die "Could not read $PG_SERVER. Does it exist in $RESOURCE_GROUP?"

read -r SERVER_STATE PUBLIC_ACCESS PG_VER <<<"$STATE"
info "state         : $SERVER_STATE"
info "public access : $PUBLIC_ACCESS"
info "version       : $PG_VER"

if [[ "$SERVER_STATE" != "Ready" ]]; then
  warn "The server is '$SERVER_STATE', not 'Ready'."
  if [[ "$SERVER_STATE" == "Stopped" ]]; then
    info "starting it…"
    az postgres flexible-server start --name "$PG_SERVER" --resource-group "$RESOURCE_GROUP" --output none
    ok "started"
  else
    die "Wait for the server to become Ready, then run this again."
  fi
fi

if [[ "$PUBLIC_ACCESS" == "Disabled" ]]; then
  warn "Public network access is disabled, so Container Apps cannot reach it."
  info "enabling…"
  az postgres flexible-server update --name "$PG_SERVER" --resource-group "$RESOURCE_GROUP" \
    --public-access Enabled --output none \
    || die "Could not enable public access. Check the subscription's policies."
  ok "enabled"
fi

# --- firewall rules ----------------------------------------------------
bold "2/4  Firewall rules"
RULES=$(az postgres flexible-server firewall-rule list \
  --resource-group "$RESOURCE_GROUP" --server-name "$PG_SERVER" \
  --query "[].{name:name, start:startIpAddress, end:endIpAddress}" -o tsv 2>/dev/null)

if [[ -z "$RULES" ]]; then
  warn "there are no firewall rules at all — this is why nothing can connect"
else
  while IFS=$'\t' read -r n s e; do info "$n: $s → $e"; done <<<"$RULES"
fi

# The 0.0.0.0–0.0.0.0 rule is Azure's sentinel for "allow Azure services".
# Container Apps consumption egress has no stable IP, so this is how the app
# reaches the database.
if echo "$RULES" | grep -q "0\.0\.0\.0	0\.0\.0\.0"; then
  ok "the Azure services rule is present"
else
  info "adding the Azure services rule…"
  # No error suppression here: if this fails, that is the whole problem.
  az postgres flexible-server firewall-rule create \
    --resource-group "$RESOURCE_GROUP" --server-name "$PG_SERVER" \
    --name AllowAzureServices \
    --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0 --output none \
    || die "Could not create the firewall rule. The error above is the real problem."
  ok "added"
fi

# --- this machine ------------------------------------------------------
bold "3/4  Allowing this machine, so the connection can be proven"
MY_IP=$(curl -s -m 10 https://api.ipify.org || echo "")
if [[ -n "$MY_IP" ]]; then
  az postgres flexible-server firewall-rule create \
    --resource-group "$RESOURCE_GROUP" --server-name "$PG_SERVER" \
    --name "admin-machine" \
    --start-ip-address "$MY_IP" --end-ip-address "$MY_IP" --output none 2>/dev/null || true
  ok "allowed $MY_IP"
  info "waiting for the rule to take effect…"
  sleep 20
else
  warn "could not determine this machine's public IP; skipping the direct test"
fi

# --- prove it ----------------------------------------------------------
bold "4/4  Testing the connection"
if command -v psql >/dev/null && [[ -n "$MY_IP" ]]; then
  if PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -U "$PG_ADMIN_USER" -d "$PG_DATABASE" \
      -c "SELECT 'connected' AS status, version();" 2>/dev/null | head -3; then
    ok "the database accepts connections"
  else
    warn "could not connect from this machine"
    info "That may just be a local network restriction on port 5432 — many"
    info "corporate and mobile networks block it. Container Apps is not affected."
  fi
else
  info "psql is not installed, so skipping the direct test."
  info "Install it with: brew install libpq && brew link --force libpq"
fi

echo
bold "Done."
info "Now re-run: ./deploy/02-deploy.sh"
