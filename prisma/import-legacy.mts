/**
 * Import members from the original Tkinter app's SQLite file.
 *
 * Reads SQLite through Node's built-in `node:sqlite`, so there is no native
 * module to compile and nothing extra to install.
 *
 *   npx tsx prisma/import-legacy.mts ./church_members.db
 *
 * Safe to re-run: a member already imported (matched on the legacy id) is
 * updated rather than duplicated. Nothing is ever deleted.
 *
 * The legacy app stored dates as free text with no validation, so this
 * accepts every format actually found in the wild and skips what it cannot
 * parse rather than guessing. Anything skipped is reported at the end.
 */
import path from "node:path";
import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

loadEnv({ quiet: true });

type LegacyRow = {
  id: number;
  surname: string | null;
  full_name: string | null;
  dob: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  children: string | null;
  marital_status: string | null;
  interests: string | null;
  salvation_date: string | null;
  baptism_date: string | null;
  previous_church: string | null;
  previous_church_location: string | null;
  ministry: string | null;
  prayer_requests: string | null;
  registration_date: string | null;
};

const NULLISH = new Set(["", "n/a", "na", "none", "null", "-", "yyyy-mm-dd", "0000-00-00"]);

function clean(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || NULLISH.has(s.toLowerCase())) return null;
  return s;
}

/** The legacy app accepted whatever was typed. Handle what actually occurs. */
function parseDate(v: string | null | undefined): Date | null {
  const s = clean(v);
  if (!s) return null;

  const patterns: [RegExp, (m: RegExpMatchArray) => [number, number, number]][] = [
    // 2004-07-22 / 2004/07/22  → Y M D
    [/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/, (m) => [+m[1], +m[2], +m[3]]],
    // 24/04/2023 / 24-04-2023  → D M Y  (SA convention)
    [/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/, (m) => [+m[3], +m[2], +m[1]]],
    // 24/04/23                 → D M YY
    [/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/, (m) => [2000 + +m[3], +m[2], +m[1]]],
  ];

  for (const [re, pick] of patterns) {
    const m = s.match(re);
    if (!m) continue;
    const [y, mo, d] = pick(m);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
    const date = new Date(y, mo - 1, d);
    if (Number.isNaN(date.getTime())) continue;
    // reject a parse that silently rolled over (e.g. 31 February)
    if (date.getMonth() !== mo - 1 || date.getDate() !== d) continue;
    return date;
  }

  const fallback = new Date(s);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function parseGender(v: string | null): "MALE" | "FEMALE" | "OTHER" | null {
  const s = clean(v)?.toLowerCase();
  if (!s) return null;
  if (s.startsWith("m")) return "MALE";
  if (s.startsWith("f")) return "FEMALE";
  return "OTHER";
}

function parseMarital(
  v: string | null,
): "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED" | null {
  const s = clean(v)?.toLowerCase();
  if (!s) return null;
  if (s.startsWith("s")) return "SINGLE";
  if (s.startsWith("m")) return "MARRIED";
  if (s.startsWith("d")) return "DIVORCED";
  if (s.startsWith("w")) return "WIDOWED";
  return null;
}

/** "Music, Choir" or "Music" → ["Music", "Choir"] */
function splitList(v: string | null): string[] {
  const s = clean(v);
  if (!s) return [];
  return s
    .split(/[,;/|]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

async function main() {
  const file = process.argv[2] ?? "./church_members.db";
  const abs = path.resolve(file);

  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  // node:sqlite will happily CREATE an empty database at a path that does not
  // exist, which would look like "no members table" rather than "wrong path".
  if (!existsSync(abs)) {
    throw new Error(`No file at ${abs}. Check the path to church_members.db.`);
  }

  console.log(`Reading ${abs}`);
  const legacy = new DatabaseSync(abs, { readOnly: true });

  const tableExists = legacy
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='members'")
    .get();
  if (!tableExists) {
    throw new Error(`No 'members' table in ${abs}. Is this the right file?`);
  }

  const rows = legacy.prepare("SELECT * FROM members").all() as unknown as LegacyRow[];
  console.log(`Found ${rows.length} legacy member ${rows.length === 1 ? "record" : "records"}\n`);

  // continue the existing numbering rather than colliding with it
  const last = await db.member.findFirst({
    orderBy: { memberNumber: "desc" },
    select: { memberNumber: true },
  });
  let nextNumber = last ? parseInt(last.memberNumber.replace(/\D/g, ""), 10) + 1 : 1;

  const warnings: string[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const fullName = clean(row.full_name);
    const surname = clean(row.surname);

    if (!fullName && !surname) {
      skipped++;
      warnings.push(`Row id=${row.id}: no name at all — skipped.`);
      continue;
    }

    // the legacy app stored first name in full_name and surname separately
    const displayName =
      fullName && surname && !fullName.toLowerCase().includes(surname.toLowerCase())
        ? `${fullName} ${surname}`
        : (fullName ?? surname!);

    for (const [field, raw] of [
      ["date of birth", row.dob],
      ["salvation date", row.salvation_date],
      ["baptism date", row.baptism_date],
    ] as const) {
      if (clean(raw) && !parseDate(raw)) {
        warnings.push(`${displayName}: could not read ${field} "${raw}" — left blank.`);
      }
    }

    const data = {
      surname: surname ?? displayName.split(/\s+/).slice(-1)[0],
      fullName: displayName,
      dob: parseDate(row.dob),
      gender: parseGender(row.gender),
      maritalStatus: parseMarital(row.marital_status),
      addressLine: clean(row.address),
      city: clean(row.city),
      province: clean(row.state),
      postalCode: clean(row.postal_code),
      phone: clean(row.phone),
      email: clean(row.email),
      children: clean(row.children),
      salvationDate: parseDate(row.salvation_date),
      baptismDate: parseDate(row.baptism_date),
      previousChurch: clean(row.previous_church),
      previousChurchLocation: clean(row.previous_church_location),
      prayerRequests: clean(row.prayer_requests),
      registrationDate: parseDate(row.registration_date) ?? new Date(),
      notes: `Imported from the previous system (legacy id ${row.id}).`,
    };

    // match on the legacy id recorded in notes, so re-running updates
    const existing = await db.member.findFirst({
      where: { notes: { contains: `legacy id ${row.id})` } },
    });

    const member = existing
      ? await db.member.update({ where: { id: existing.id }, data })
      : await db.member.create({
          data: { ...data, memberNumber: `VIC-${String(nextNumber++).padStart(4, "0")}` },
        });

    existing ? updated++ : created++;

    // ministries and interests were single free-text columns
    for (const name of splitList(row.ministry)) {
      const ministry = await db.ministry.upsert({
        where: { name },
        create: { name },
        update: {},
      });
      await db.memberMinistry
        .create({ data: { memberId: member.id, ministryId: ministry.id } })
        .catch(() => {}); // already linked
    }

    for (const name of splitList(row.interests)) {
      const interest = await db.interest.upsert({
        where: { name },
        create: { name },
        update: {},
      });
      await db.memberInterest
        .create({ data: { memberId: member.id, interestId: interest.id } })
        .catch(() => {});
    }

    console.log(`  ${existing ? "updated" : "imported"}  ${member.memberNumber}  ${member.fullName}`);
  }

  legacy.close();

  console.log(`\n${created} imported, ${updated} updated, ${skipped} skipped.`);

  if (warnings.length) {
    console.log(`\n${warnings.length} thing${warnings.length === 1 ? "" : "s"} to check:`);
    for (const w of warnings) console.log(`  · ${w}`);
    console.log("\nThese fields were left blank rather than guessed. Fix them in the app.");
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error("\nImport failed:", e.message);
  process.exit(1);
});
