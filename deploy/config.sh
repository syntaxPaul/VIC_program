#!/usr/bin/env bash
# Shared settings for every deploy script. Edit this file, not the others.

# --- names you may want to change -------------------------------------
LOCATION="${LOCATION:-southafricanorth}"
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-vic-church}"
APP_NAME="${APP_NAME:-vic-church}"

# Globally unique names. If provisioning fails saying a name is taken,
# add a suffix here (e.g. acrvicchurch2).
ACR_NAME="${ACR_NAME:-acrvicchurch}"
STORAGE_ACCOUNT="${STORAGE_ACCOUNT:-stvicchurch}"
PG_SERVER="${PG_SERVER:-pg-vic-church}"

# --- derived ----------------------------------------------------------
ENV_NAME="${ENV_NAME:-cae-vic-church}"
IDENTITY_NAME="${IDENTITY_NAME:-id-vic-church}"
MIGRATE_JOB="${MIGRATE_JOB:-vic-church-migrate}"
BACKUP_JOB="${BACKUP_JOB:-vic-church-backup}"
PG_ADMIN_USER="${PG_ADMIN_USER:-vicadmin}"
PG_DATABASE="${PG_DATABASE:-church}"
BLOB_CONTAINER="${BLOB_CONTAINER:-uploads}"
BACKUP_CONTAINER="${BACKUP_CONTAINER:-backups}"
IMAGE_NAME="${IMAGE_NAME:-vic-church}"

# Postgres size. Burstable B1ms is the smallest managed tier (~$16/month).
PG_TIER="${PG_TIER:-Burstable}"
PG_SKU="${PG_SKU:-Standard_B1ms}"
PG_STORAGE_GB="${PG_STORAGE_GB:-32}"        # 32 is the minimum
PG_VERSION="${PG_VERSION:-17}"
PG_BACKUP_RETENTION_DAYS="${PG_BACKUP_RETENTION_DAYS:-35}"   # 7-35; 35 is the max

# Container sizing. 0.5 vCPU / 1 GiB is comfortable for a small congregation.
APP_CPU="${APP_CPU:-0.5}"
APP_MEMORY="${APP_MEMORY:-1.0Gi}"
# One replica always running. At zero the container sleeps when idle and the
# first request afterwards waits several seconds for it to start — which is
# every Sunday morning, and every time somebody opens the membership link from
# a poster. Roughly $10 a month buys that away. Set APP_MIN_REPLICAS=0 to go
# back to sleeping.
APP_MIN_REPLICAS="${APP_MIN_REPLICAS:-1}"
# Kept at 1 deliberately: Next.js caches per replica, so several replicas
# would disagree with each other. A church's traffic does not need more.
APP_MAX_REPLICAS="${APP_MAX_REPLICAS:-1}"

set -euo pipefail

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
info() { printf '  %s\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

require_az() {
  command -v az >/dev/null || die "The Azure CLI is not installed. See https://aka.ms/azure-cli"
  az account show >/dev/null 2>&1 || die "Not signed in. Run: az login"
}
