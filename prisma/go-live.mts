/**
 * Turns a demo installation into the church's real system.
 *
 *   npx tsx prisma/go-live.mts
 *
 * It deletes every demo record, removes the published demo accounts, and
 * creates one real administrator. It refuses to run if real data is already
 * present, so it cannot be used by accident after go-live.
 *
 * Nothing here is reversible. Take a backup first.
 *
 * For an unattended run (a rehearsal, or a scripted rebuild) set
 * GO_LIVE_CONFIRM=1 and supply the values as environment variables:
 *   CHURCH_NAME BRANCH_NAME ADDRESS CITY PROVINCE POSTAL_CODE PHONE
 *   OFFICE_EMAIL NPO_NUMBER PBO_NUMBER SECTION_18A_NUMBER FY_START_MONTH
 *   ADMIN_NAME ADMIN_EMAIL ADMIN_PASSWORD
 * A registration number left empty means "not registered".
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import bcrypt from "bcryptjs";
import { ensureReferenceData, financialYearStart } from "./reference-data";

loadEnv({ quiet: true });

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const UNATTENDED = process.env.GO_LIVE_CONFIRM === "1";
const rl = UNATTENDED ? null : createInterface({ input: stdin, output: stdout });

const DEMO_EMAILS = [
  "admin@vic.org",
  "treasurer@vic.org",
  "secretary@vic.org",
  "pastor@vic.org",
];

function env(name: string, fallback = "") {
  return (process.env[name] ?? fallback).trim();
}

async function ask(q: string, fallback = "", envName?: string): Promise<string> {
  if (UNATTENDED) return envName ? env(envName, fallback) : fallback;
  const a = (await rl!.question(fallback ? `${q} [${fallback}] ` : `${q} `)).trim();
  return a || fallback;
}

async function askRequired(q: string, envName: string): Promise<string> {
  if (UNATTENDED) {
    const v = env(envName);
    if (!v) throw new Error(`${envName} is required when GO_LIVE_CONFIRM=1.`);
    return v;
  }
  for (;;) {
    const a = (await rl!.question(`${q} `)).trim();
    if (a) return a;
    console.log("  Required.");
  }
}

async function askYesNo(q: string, fallback = false, envName?: string): Promise<boolean> {
  if (UNATTENDED) return envName ? env(envName).length > 0 : fallback;
  const a = (await rl!.question(`${q} [${fallback ? "Y/n" : "y/N"}] `)).trim().toLowerCase();
  if (!a) return fallback;
  return a.startsWith("y");
}

async function askPassword(): Promise<string> {
  if (UNATTENDED) {
    const v = env("ADMIN_PASSWORD");
    if (v.length < 10) throw new Error("ADMIN_PASSWORD must be at least 10 characters.");
    return v;
  }
  for (;;) {
    const a = await rl!.question("Password for the administrator (min 10 characters): ");
    if (a.trim().length < 10) {
      console.log("  Too short.");
      continue;
    }
    const b = await rl!.question("Type it again: ");
    if (a !== b) {
      console.log("  Those did not match.");
      continue;
    }
    return a;
  }
}

async function main() {
  console.log("\n\x1b[1mVictory in Christ — go live\x1b[0m\n");

  // --- safety: refuse to wipe real data ------------------------------
  const realUsers = await db.user.count({
    where: { email: { notIn: DEMO_EMAILS } },
  });

  if (realUsers > 0) {
    console.log(
      `This system already has ${realUsers} real user account${realUsers === 1 ? "" : "s"}, so it is\n` +
        "already live. Refusing to wipe it.\n\n" +
        "To add more people, use Settings → Users in the app.",
    );
    return;
  }

  const counts = {
    members: await db.member.count(),
    transactions: await db.transaction.count(),
    assets: await db.asset.count(),
  };

  console.log("This will permanently delete all existing data:\n");
  console.log(`  members       ${counts.members}`);
  console.log(`  transactions  ${counts.transactions}`);
  console.log(`  assets        ${counts.assets}`);
  console.log("\nand then create the church's real administrator account.\n");
  console.log("\x1b[33mThere is no undo. Make sure you have a backup.\x1b[0m\n");

  const confirm = UNATTENDED
    ? "DELETE EVERYTHING"
    : await rl!.question('Type "DELETE EVERYTHING" to continue: ');
  if (confirm.trim() !== "DELETE EVERYTHING") {
    console.log("\nCancelled. Nothing was changed.");
    return;
  }

  // --- gather the real details ---------------------------------------
  console.log("\n\x1b[1mChurch details\x1b[0m — these print on every report and certificate.\n");
  const churchName = await ask("Church name:", "Victory in Christ", "CHURCH_NAME");
  const addressLine1 = await ask("Street address:", "", "ADDRESS");
  const city = await ask("City / township:", "", "CITY");
  const province = await ask("Province:", "Gauteng", "PROVINCE");
  const postalCode = await ask("Postal code:", "", "POSTAL_CODE");
  const phone = await ask("Phone:", "", "PHONE");
  const email = await ask("Office email:", "", "OFFICE_EMAIL");

  console.log("\n\x1b[1mRegistration\x1b[0m — only tick what SARS or the DSD has actually granted.\n");
  const isNpoRegistered = await askYesNo("Registered NPO with the Department of Social Development?", false, "NPO_NUMBER");
  const npoNumber = isNpoRegistered ? await ask("  NPO number:", "", "NPO_NUMBER") : "";
  const isPboApproved = await askYesNo("Approved PBO with the SARS Tax Exemption Unit?", false, "PBO_NUMBER");
  const pboNumber = isPboApproved ? await ask("  PBO number:", "", "PBO_NUMBER") : "";
  const is18aApproved = await askYesNo(
    "Section 18A approved?\n  (Separate from PBO status. Ordinary tithes and offerings are\n   generally NOT 18A deductible — only donations funding approved\n   Part II activities such as welfare and relief.)",
    false,
    "SECTION_18A_NUMBER",
  );
  const section18aNumber = is18aApproved ? await ask("  Section 18A reference:", "", "SECTION_18A_NUMBER") : "";

  console.log("\n\x1b[1mFinancial year\x1b[0m\n");
  const fyMonth = parseInt(
    await ask("Month the financial year starts (1-12, March aligns with SARS):", "3", "FY_START_MONTH"),
    10,
  );

  console.log("\n\x1b[1mAdministrator account\x1b[0m\n");
  const adminName = await askRequired("Full name:", "ADMIN_NAME");
  const adminEmail = (await askRequired("Email (used to sign in):", "ADMIN_EMAIL")).toLowerCase();
  const adminPassword = await askPassword();

  // --- do it ----------------------------------------------------------
  console.log("\nClearing…");

  await db.$transaction([
    db.verification.deleteMany(),
    db.stocktake.deleteMany(),
    db.asset.deleteMany(),
    db.attendanceEntry.deleteMany(),
    db.attendanceRegister.deleteMany(),
    db.receipt18A.deleteMany(),
    db.contributionLine.deleteMany(),
    db.transaction.deleteMany(),
    db.fundTransfer.deleteMany(),
    db.batch.deleteMany(),
    db.budgetLine.deleteMany(),
    db.budget.deleteMany(),
    db.baptism.deleteMany(),
    db.event.deleteMany(),
    db.memberMinistry.deleteMany(),
    db.memberInterest.deleteMany(),
    db.member.deleteMany(),
    db.household.deleteMany(),
    db.pastoralNote.deleteMany(),
    db.auditLog.deleteMany(),
    db.user.deleteMany(),
  ]);

  // Funds and the chart of accounts are the church's structure, not demo
  // data. Any that exist are kept; any missing are created — a freshly
  // migrated production database has none at all, since migrations create
  // the schema and nothing else.
  console.log("Setting up funds and the chart of accounts…");
  const ref = await ensureReferenceData(db as never, {
    openingDate: financialYearStart(new Date(), Number.isFinite(fyMonth) ? fyMonth : 3),
  });

  // Opening balances are zeroed so the real ones can be entered from the
  // church's own records.
  await db.fund.updateMany({
    data: {
      openingBalance: 0,
      openingDate: financialYearStart(new Date(), Number.isFinite(fyMonth) ? fyMonth : 3),
    },
  });

  console.log("Setting the church's details…");
  await db.settings.upsert({
    where: { id: 1 },
    create: {
      id: 1, churchName, addressLine1, city, province, postalCode,
      phone, email, isNpoRegistered, npoNumber, isPboApproved, pboNumber,
      is18aApproved, section18aNumber,
      financialYearStartMonth: Number.isFinite(fyMonth) ? fyMonth : 3,
    },
    update: {
      churchName, addressLine1, city, province, postalCode,
      phone, email, isNpoRegistered, npoNumber, isPboApproved, pboNumber,
      is18aApproved, section18aNumber,
      financialYearStartMonth: Number.isFinite(fyMonth) ? fyMonth : 3,
    },
  });

  console.log("Creating the administrator…");
  await db.user.create({
    data: {
      email: adminEmail,
      name: adminName,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: "ADMIN",
    },
  });

  const funds = await db.fund.count();
  const accounts = await db.account.count();
  void ref;

  console.log("\n\x1b[32m✓ This system is now live.\x1b[0m\n");
  console.log(`  Sign in as  ${adminEmail}`);
  console.log(`  Ready       ${funds} funds, ${accounts} accounts, opening balances at zero`);
  console.log("\nWhat to do next:\n");
  console.log("  1. Enter the real opening balance for each fund, from the church's");
  console.log("     own records. Every report depends on these being right.");
  console.log("  2. Create accounts for the treasurer, secretary and pastor under");
  console.log("     Settings → Users.");
  console.log("  3. Import the old member records:");
  console.log("     npx tsx prisma/import-legacy.mts /path/to/church_members.db");
  console.log("  4. Have the accounting officer review the chart of accounts.\n");
}

main()
  .catch((e) => {
    console.error("\nFailed:", e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl?.close();
    await db.$disconnect();
  });
