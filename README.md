# Victory in Christ — Church Management System

A rebuild of `VIC_program` as a modern multi-user web application. The original
was a single 259-line Tkinter file that registered members and shipped as a
Windows `.exe`. This replaces it with members, fund accounting, an asset
register, a church planner and the baptism programme.

---

## Running it

```bash
npm install
cp .env.example .env      # then edit AUTH_SECRET
npx prisma migrate deploy
npx prisma generate
npx tsx prisma/seed.ts    # optional: demo data
npm run dev               # http://localhost:3000
```

### Bringing your existing records across

The original app's `church_members.db` imports directly:

```bash
npx tsx prisma/import-legacy.mts /path/to/church_members.db
```

Safe to re-run — a record already imported is updated, never duplicated.
The old app stored dates as free text with no validation, so the importer
accepts every format that actually occurs (`2004/07/22`, `24/04/2023`,
`N/A`) and **reports anything it could not read rather than guessing**.
Ministries and interests, which were single free-text columns, are split on
commas and turned into real records.

Demo accounts (seed data only) — password `vic2026` for all:

| Email | Role | Can do |
|---|---|---|
| `admin@vic.org` | Administrator | Everything, including users and settings |
| `treasurer@vic.org` | Treasurer | Finance and assets; read-only elsewhere |
| `secretary@vic.org` | Secretary | Members, planner, sacraments |
| `pastor@vic.org` | Pastor | Read-only across the board, plus sacraments |

**Before going live:** set a real `AUTH_SECRET`, delete the demo users, and
create your own accounts under Settings → Users.

---

## What it does

### People
- **Members** — directory with search and filters, full profiles, sectioned
  registration form. Every field from the old app is carried over.
- **Ministries** — many-to-many, so a member can serve in several.
- **Attendance** — service headcounts with a trend chart.
- **Baptisms** — candidates tracked from class through to baptism, with
  register numbers and printable A4 certificates.

### Finance
Built on **fund accounting**, which is how churches actually keep books. A fund
is a pot of money defined by purpose, not by bank account. Every income and
expense line carries **both** a fund (whose money) and an account (what kind) —
that one decision is what makes every report below possible.

- **Contributions** — offering batches with a `Draft → Counted → Reviewed →
  Posted` lifecycle. Two counters are recorded, a declared total is checked
  against the captured total, and a posted batch locks. This is the church's
  main internal control.
- **Expenses** — every category from the brief exists as a real account:
  stipend, housekeeper, cleaners, pastors, band, tithe to main ministry,
  honorarium, electricity, transport, offering to other churches, music and
  media, cleaning materials, registration fee, repairs, catering, dalmada
  fundraising, children feeding scheme, appreciations.
- **Funds** — balances per fund, plus transfers between funds.
- **Chart of accounts** — the standard 1000–5000 block structure.

### Assets
- **Register** — cost, location, custodian, condition, insurance, and
  straight-line depreciation to net book value.
- **Stocktake** — verification rounds with printable count sheets per location
  and the five standard exception outcomes.
- **Write-offs** — never a delete. Requires a council resolution reference and
  stays visible in the "Disposed & written off" view.

### Planner
Month calendar, colour-coded by category, with a printable A4 landscape version
and an events schedule beneath it.

### Reports — all print to A4
1. Income & Expenditure Statement
2. Fund Balance Report
3. Monthly Comparison (accounts down, months across)
4. Budget vs Actual
5. Statement of Financial Position
6. Contributions by Member
7. Fixed Asset Register
8. Donor / contribution statements

Plus offering count sheets and stocktake count sheets.

---

## South African specifics

- **Currency** formats as `R 1 234 567,89` — space thousands, comma decimal,
  per the en-ZA convention. Negatives render in parentheses in financial
  statements, per accounting convention.
- **Financial year** defaults to 1 March – end February, matching the SARS year
  of assessment. Configurable in Settings.
- **Compliance is configurable, never assumed.** Settings has separate toggles
  for NPO registration, PBO approval and Section 18A approval, each with its
  own number. These print on every report.

### A word on Section 18A

Ordinary tithes and general offerings to a church are **generally not
deductible** under Section 18A — religious activity sits in Part I of the Ninth
Schedule, while s18A deductions require Part II activities (welfare, relief,
education for the unemployed, and similar). Accordingly:

- `is18aEligible` is a **per-fund flag, defaulting to OFF**.
- The seed enables it only for Benevolence and the Children Feeding Scheme.
- The donor tax fields on member records only appear when 18A is switched on.
- The contribution statement explicitly states it is *not* an 18A receipt.

**Confirm the branch's actual tax status with its accounting officer before
relying on any of this.** The system is built so both a receipts-and-payments
and an accrual presentation are possible; which one is appropriate is a
question for the accounting officer, not for the software.

---

## Technical

| | |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, custom design tokens |
| Database | SQLite via Prisma 7 (driver adapter) |
| Auth | JWT session cookie, bcrypt, four roles |
| Charts | Recharts |

### Design

Warm neutrals as the ground rather than clinical grey-white, one bronze brand
accent, and gold reserved for decoration only — it fails contrast at body size,
so it never carries text. Semantic colours (success, warning, danger) are fixed
and never brand-tinted. Money always renders right-aligned in tabular figures,
and colour is always paired with a sign or arrow so it never carries meaning
alone. Light and dark themes both ship.

Every long form is a single column of sectioned cards with a sticky save bar,
not a wizard. Tables pin a totals row. `⌘K` opens a command palette that jumps
to any page, member or asset.

### Switching to PostgreSQL

SQLite is genuinely fine for a single congregation — thousands of members, tens
of thousands of transactions. If you want to host on Vercel, which has no
persistent disk, switch to Postgres:

1. `prisma/schema.prisma` → `provider = "postgresql"`
2. `npm i @prisma/adapter-pg` and swap the adapter in `src/lib/db.ts`
3. Point `DATABASE_URL` at Neon or Supabase (both have free tiers)
4. `npx prisma migrate dev --name init`

Otherwise deploy to Railway, Fly.io or any VPS with a mounted volume and keep
SQLite.

### Data model notes

- **Soft deletes throughout** (`deletedAt`), because both the NPO Act and the
  Tax Administration Act require records to be kept for at least five years.
- **Audit log** records who created, posted or approved what.
- A **posted batch is immutable** — corrections are reversing journals, not
  edits.

---

## Photos

Member and asset photos are validated by magic number, not by the declared
MIME type, capped at 5 MB, and stored in `UPLOAD_DIR` — outside the build, so
they survive a redeploy. They are served through `/api/photo/[name]` behind
the session check, so photos are not publicly addressable. Point `UPLOAD_DIR`
at a mounted volume in production; on a platform with no persistent disk,
only `src/lib/uploads.ts` needs to change to use object storage.

---

## Verification

Everything below was run against the finished build:

- **TypeScript** — clean, no errors.
- **Production build** — clean, 48 routes.
- **Route audit** — all 44 admin routes return 200 with no console or runtime
  errors, and every restricted route correctly redirects Treasurer, Secretary
  and Pastor away from Settings and Users.
- **End-to-end flows** — 14 checks covering member registration and editing,
  expense capture (including `1 234,56` parsing), the full batch lifecycle
  through to posting and locking, asset creation and write-off, the attendance
  register, 18A fund gating, and the command palette.
- **Accounting** — 14 independent checks recomputing the reports from raw
  rows: fund identities balance, per-fund income sums to total receipts,
  transfers net to zero, posted batches reconcile to the ledger entries they
  created, depreciation never exceeds cost less residual, no restricted fund
  is overdrawn, and ZAR formatting round-trips.

---

## Known limits

- **Recurring events** are stored with a recurrence field but the planner does
  not yet expand them — repeating services are seeded as individual events.
- **No backup schedule.** For SQLite, copy `prisma/dev.db` and the
  `UPLOAD_DIR` folder somewhere safe on a cron. This matters: the NPO Act and
  the Tax Administration Act both require five years of records.
- **No email.** Contribution statements and certificates print or save as PDF
  from the browser; nothing is sent automatically.
- The **compliance guidance in this app is not legal or tax advice.** Confirm
  the branch's NPO, PBO and 18A status, and the appropriate reporting basis,
  with its accounting officer.
