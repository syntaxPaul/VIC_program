# Deployment and operations

Everything needed to run this for a real congregation on Azure, and to keep
it running. Written for whoever maintains it — which may not be the person
who built it.

---

## What gets created

One resource group in **South Africa North** — Johannesburg, which keeps
member data in the country and is the closest region to Mamelodi.

| Resource | What it does |
|---|---|
| Container App | Runs the application. Scales to zero when idle. |
| Container Apps environment | The surrounding network and logging |
| PostgreSQL Flexible Server (B1ms) | The database. Automated backups with point-in-time restore. |
| Container Registry (Basic) | Holds the built images |
| Storage account | Member and asset photos, and nightly database dumps |
| Managed identity | Lets the app reach the registry and storage without any password |

No passwords are stored anywhere except the database connection string,
which lives as a Container App secret. The app authenticates to storage
with its managed identity.

---

## First deployment

You need the [Azure CLI](https://aka.ms/azure-cli) and to be signed in:

```bash
az login
az account set --subscription "<your subscription>"
```

Then, from the repository root:

```bash
./deploy/01-provision.sh     # creates the Azure resources  (~10 min)
./deploy/02-deploy.sh        # builds, migrates, deploys    (~8 min)
./deploy/03-backups.sh       # nightly dumps to blob storage
./deploy/04-restore-drill.sh # proves the backups restore
```

If anything reports it cannot reach the database, `./deploy/05-fix-database-access.sh`
diagnoses and repairs it.

`01-provision.sh` writes `deploy/.env.azure`, which contains the database
password and the app's signing secret. **It is gitignored. Keep a copy
somewhere safe** — a password manager, not a laptop. If you lose it you can
reset the database password, but you will sign everyone out.

Every script is safe to re-run.

### Putting data in it

Migrations create the schema and nothing else, so a freshly deployed system
has no account to sign in with and no chart of accounts to record against.

To look around first with invented records:

```bash
./deploy/07-setup-data.sh --demo
```

To set up the church's real system — its details, funds, chart of accounts
and one administrator:

```bash
./deploy/07-setup-data.sh
```

Both run inside Azure as a one-off job, so nothing needs installing on your
machine. Going live refuses to run once a real account exists.

### Running go-live from your own machine instead

If you would rather run it locally against the production database:

```bash
npx tsx prisma/go-live.mts
```

This deletes every demo record, removes the four published demo accounts,
asks for the church's real details, and creates the real administrator. It
keeps the funds and chart of accounts, and zeroes the opening balances so
real ones can be entered.

It refuses to run once a real account exists, so it cannot wipe live data
by accident.

Run it against the production database:

```bash
set -a; source deploy/.env.azure; set +a
npx tsx prisma/go-live.mts
```

### Bringing the old records across

```bash
npx tsx prisma/import-legacy.mts /path/to/church_members.db
```

Safe to re-run — an already-imported record is updated, never duplicated.

---

## Routine deployment

```bash
git pull
./deploy/02-deploy.sh
```

Migrations run as a **separate job** before the app rolls forward. If a
migration fails, the deployment stops and the previous version keeps
serving. That is deliberate: a failed migration inside the app's startup
path would put it in a crash loop instead.

---

## Backups

Two independent layers.

**Azure point-in-time restore** — continuous, 35 days, on by default,
nothing to configure. Restores the whole server to any moment in that
window, to a *new* server. Use it for "we need yesterday afternoon back".

```bash
az postgres flexible-server restore \
  --resource-group rg-vic-church \
  --name pg-vic-church-restored \
  --source-server pg-vic-church \
  --restore-time "2026-09-20T14:30:00+02:00"
```

Then point the app at the restored server by updating the `db-url` secret.

**Nightly dumps to blob storage** — a compressed `pg_dump` at 03:00 SAST,
kept for 400 days. Covers what point-in-time restore cannot: pulling back a
single table, and anything older than 35 days. The NPO Act requires five
years of records, so this layer matters.

The job refuses to upload a dump under 2 KB, so a silently-failing backup
shows up as a failed job rather than a file full of nothing.

### Geo-redundancy, and why it is off

South Africa North's paired region is South Africa West, which is
**access-restricted**. Geo-redundant backups can only be restored into the
paired region, so enabling them would buy a disaster-recovery option the
church may not actually be able to exercise without a support request. It
also cannot be changed after the server is created.

The nightly dumps in blob storage are the practical answer: they are
independent of the database server entirely. If the church later wants
true geo-redundancy, the storage account can be switched to GRS, which
replicates the dumps out of region.

---

## When something is wrong

**The site will not load.**

```bash
az containerapp logs show -n vic-church -g rg-vic-church --tail 100 --follow
az containerapp revision list -n vic-church -g rg-vic-church -o table
```

Roll back to the previous revision:

```bash
az containerapp revision set-mode -n vic-church -g rg-vic-church --mode single
az containerapp update -n vic-church -g rg-vic-church --revision <previous>
```

**"P1001: Can't reach database server".** The firewall rule that lets Azure
services reach PostgreSQL is missing or the server is stopped. Run:

```bash
./deploy/05-fix-database-access.sh
```

It reports the server's actual network configuration, repairs the rule, and
proves the connection.

**"connection refused" reaching the registry during deployment.** Azure's
own control plane failing to reach the container registry. Usually
transient; the deploy script retries three times. If it persists:

```bash
./deploy/06-fix-registry-access.sh
```

It checks the registry's network configuration, managed-identity
authentication, that the image was actually pushed, and the pull
permission, then retries the deployment.

**Is it the database?** Sign in as an administrator and open
`/api/diagnostics`. It reports database reachability and latency, which
storage backend is in use, and the running revision. It is admin-only and
deliberately not used as a health probe.

**The first visit of the day is slow.** That is scale-to-zero: with no
traffic the app shuts down entirely and the next request restarts it. If
this bothers the congregation, keep one replica warm — roughly $10/month:

```bash
az containerapp update -n vic-church -g rg-vic-church --min-replicas 1
```

A cheaper middle ground is a scheduled job that wakes the app before the
Sunday service.

**Photos are not appearing.** Almost always RBAC propagation on a fresh
deployment, which can take a few minutes. Re-running `01-provision.sh` is
safe and re-applies the role assignments.

---

## What it costs

Realistic monthly figures for a single congregation, South Africa North:

| | Monthly |
|---|---|
| PostgreSQL B1ms compute | ~$16 |
| PostgreSQL storage, 32 GB | ~$5 |
| Container Registry (Basic) | ~$5 |
| Blob storage | well under $1 |
| Container App, scaling to zero | $0 — inside the free monthly grant |
| **Total** | **~$26** |

Keeping a replica always warm adds roughly $10.

About $21 of that bills whether anyone uses the system or not — the
database and registry do not scale down. There is no cheaper managed
Postgres tier than B1ms.

> **Check the first invoice.** Azure introduced several Container Apps
> "Environment" meters in September 2026 that the billing documentation
> does not yet describe by name. They appear to apply only to private
> endpoints, planned maintenance and dedicated workload profiles — none of
> which this deployment uses — but that could not be confirmed from the
> documentation. If an unexpected "Environment" line appears, that is what
> it is.

---

## Security notes

- HTTPS is automatic and HTTP redirects to it. Nothing to configure.
- The database has no public firewall opening beyond "Azure services";
  there is no route to it from the open internet.
- Photos are served through an authenticated route, never from a public
  blob URL.
- Uploads are validated by magic number rather than the declared MIME type.
- Sessions are signed with `AUTH_SECRET` from `deploy/.env.azure`. Rotating
  it signs everyone out, which is the correct response to a suspected leak.
- Records are soft-deleted, because the NPO Act and the Tax Administration
  Act both require five years of retention.

Not implemented, and worth knowing: there is no login rate limiting, no
two-factor authentication, and no self-service password reset. For a
congregation of this size with a handful of staff accounts these are
acceptable gaps, but they are gaps rather than oversights.

---

## Local development

```bash
docker run -d --name vic-pg -e POSTGRES_PASSWORD=vicdev \
  -e POSTGRES_USER=vic -e POSTGRES_DB=church -p 5432:5432 postgres:17

cp .env.example .env     # the defaults match the container above
npm install
npx prisma migrate deploy
npx prisma generate
npx tsx prisma/seed.ts
npm run dev
```

Photos go to `./storage/uploads` locally and to blob storage in production;
the switch is `AZURE_STORAGE_ACCOUNT_NAME` being set, not an environment
name, so there is no "works locally, breaks in production" gap to discover.
