#!/usr/bin/env bash
#
# Proves the backups actually restore.
#
#   ./deploy/04-restore-drill.sh
#
# Downloads the most recent nightly dump, loads it into a scratch database
# alongside the live one, checks the data is really there, then deletes the
# scratch database. The live database is never touched.
#
# Do this after go-live, and again once a year. A backup nobody has restored
# is a hope, not a backup.

cd "$(dirname "$0")/.." || exit 1
source deploy/config.sh
require_az

[[ -f deploy/.env.azure ]] || die "deploy/.env.azure is missing. Run ./deploy/01-provision.sh first."
set -a; source deploy/.env.azure; set +a

command -v psql >/dev/null || die "psql is not installed. On macOS: brew install libpq && brew link --force libpq"

DRILL_DB="restore_drill_$(date +%s)"
WORK=$(mktemp -d)
cleanup() {
  rm -rf "$WORK"
  if [[ "${DRILL_CREATED:-0}" == "1" ]]; then
    info "removing the scratch database…"
    PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -U "$PG_ADMIN_USER" -d postgres \
      -c "DROP DATABASE IF EXISTS \"$DRILL_DB\";" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

bold "Restore drill"
info "The live database is not touched. A scratch copy is created and removed."
echo

# --- your IP needs to reach the server --------------------------------
MY_IP=$(curl -s -m 10 https://api.ipify.org || echo "")
if [[ -n "$MY_IP" ]]; then
  az postgres flexible-server firewall-rule create \
    --resource-group "$RESOURCE_GROUP" --server-name "$PG_SERVER" \
    --name "drill-$(date +%s)" \
    --start-ip-address "$MY_IP" --end-ip-address "$MY_IP" --output none 2>/dev/null || true
  info "allowed this machine ($MY_IP) through the firewall"
  sleep 10
fi

# --- newest dump ------------------------------------------------------
bold "1/4  Finding the most recent dump"
LATEST=$(az storage blob list \
  --account-name "$STORAGE_ACCOUNT" --container-name "$BACKUP_CONTAINER" \
  --prefix "db/" --auth-mode login \
  --query "sort_by([].{name:name, at:properties.lastModified}, &at)[-1].name" -o tsv 2>/dev/null || echo "")

[[ -n "$LATEST" && "$LATEST" != "None" ]] || die \
  "No dumps found in ${STORAGE_ACCOUNT}/${BACKUP_CONTAINER}/db/.
   The nightly job may not have run yet. Force one with:
     az containerapp job start -n $BACKUP_JOB -g $RESOURCE_GROUP"
ok "$LATEST"

bold "2/4  Downloading"
az storage blob download \
  --account-name "$STORAGE_ACCOUNT" --container-name "$BACKUP_CONTAINER" \
  --name "$LATEST" --file "$WORK/dump.sql.gz" --auth-mode login --output none
gunzip "$WORK/dump.sql.gz"
ok "$(du -h "$WORK/dump.sql" | cut -f1) uncompressed"

# --- restore into a scratch database ----------------------------------
bold "3/4  Restoring into $DRILL_DB"
export PGPASSWORD="$PG_PASSWORD"
psql -h "$PG_HOST" -U "$PG_ADMIN_USER" -d postgres \
  -c "CREATE DATABASE \"$DRILL_DB\";" >/dev/null
DRILL_CREATED=1
psql -h "$PG_HOST" -U "$PG_ADMIN_USER" -d "$DRILL_DB" \
  -v ON_ERROR_STOP=1 -q -f "$WORK/dump.sql" >/dev/null 2>"$WORK/err.log" || {
    warn "restore reported errors:"; tail -20 "$WORK/err.log"; die "Restore failed."; }
ok "restored"

# --- prove the data is there ------------------------------------------
bold "4/4  Checking the restored data"
read -r MEMBERS TX USERS FUNDS <<<"$(psql -h "$PG_HOST" -U "$PG_ADMIN_USER" -d "$DRILL_DB" -tAF' ' -c \
  'SELECT (SELECT count(*) FROM "Member"), (SELECT count(*) FROM "Transaction"), (SELECT count(*) FROM "User"), (SELECT count(*) FROM "Fund");')"

printf '  members      %s\n  transactions %s\n  users        %s\n  funds        %s\n' \
  "$MEMBERS" "$TX" "$USERS" "$FUNDS"

echo
if [[ "${USERS:-0}" -gt 0 && "${FUNDS:-0}" -gt 0 ]]; then
  ok "The backup restores and contains real data."
  bold "Drill passed."
else
  die "The dump restored but looks empty. Investigate before relying on these backups."
fi

info "Record that you ran this, and the date, in the church's records."
