/**
 * Turn the demonstration install into the church's own system.
 *
 * Clears everything that was invented to show the app working — members,
 * money, assets, events, baptisms, notes — and keeps what is real: the chart
 * of accounts, the funds, the church's settings, and every membership form
 * that arrived through the public link. Those forms were filled in by actual
 * people and are not ours to throw away.
 *
 * Then creates one account per office. Passwords come from the environment so
 * they are never committed; each is printed once, here, and cannot be read
 * back afterwards.
 *
 *   CONFIRM=1 npx tsx prisma/setup-church.mts
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { ensureReferenceData } from "./reference-data";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

type Office = {
  role: "ADMIN" | "PASTOR" | "DISCIPLESHIP" | "EVANGELIST" | "TREASURER" | "SECRETARY";
  env: string;
  defaultName: string;
  defaultEmail: string;
};

const OFFICES: Office[] = [
  { role: "ADMIN", env: "ADMIN", defaultName: "Administrator", defaultEmail: "admin@vic" },
  { role: "PASTOR", env: "PASTOR", defaultName: "Pastor", defaultEmail: "pastor@vic" },
  { role: "DISCIPLESHIP", env: "DISCIPLESHIP", defaultName: "Discipleship Leader", defaultEmail: "discipleship@vic" },
  { role: "EVANGELIST", env: "EVANGELIST", defaultName: "Evangelist", defaultEmail: "evangelist@vic" },
  { role: "TREASURER", env: "TREASURER", defaultName: "Treasurer", defaultEmail: "treasurer@vic" },
  { role: "SECRETARY", env: "SECRETARY", defaultName: "Secretary", defaultEmail: "secretary@vic" },
];

async function main() {
  if (process.env.CONFIRM !== "1") {
    console.error("Refusing to run without CONFIRM=1. This clears the demonstration data.");
    process.exit(1);
  }

  const kept = await db.membershipApplication.count();

  console.log("Clearing the demonstration data…");
  // Order matters: children before parents. Membership forms are not in this
  // list, and their link to a member is ON DELETE SET NULL so clearing the
  // register leaves them standing.
  await db.$transaction([
    db.receipt18A.deleteMany(),
    db.welfareGrant.deleteMany(),
    db.childrensActivity.deleteMany(),
    db.youthMeeting.deleteMany(),
    db.outreach.deleteMany(),
    db.consecration.deleteMany(),
    db.contributionLine.deleteMany(),
    db.transaction.deleteMany(),
    db.fundTransfer.deleteMany(),
    db.batch.deleteMany(),
    db.budgetLine.deleteMany(),
    db.budget.deleteMany(),
    db.verification.deleteMany(),
    db.stocktake.deleteMany(),
    db.asset.deleteMany(),
    db.attendanceEntry.deleteMany(),
    db.attendanceRegister.deleteMany(),
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

  // The chart of accounts, funds, ministries and interests are the church's
  // structure, not demonstration data. Recreated if missing, left alone if not.
  await ensureReferenceData(db as never, {});

  // Demo funds carried invented opening balances. The real ones are set by the
  // accounting officer, so start every fund at nil rather than at a fiction.
  await db.fund.updateMany({ data: { openingBalance: 0 } });

  const created: { office: string; name: string; email: string; password: string }[] = [];

  for (const o of OFFICES) {
    const name = process.env[`${o.env}_NAME`] ?? o.defaultName;
    const email = (process.env[`${o.env}_EMAIL`] ?? o.defaultEmail).toLowerCase();
    const password = process.env[`${o.env}_PASSWORD`];
    if (!password) {
      console.error(`Missing ${o.env}_PASSWORD.`);
      process.exit(1);
    }
    await db.user.create({
      data: { name, email, passwordHash: await bcrypt.hash(password, 10), role: o.role },
    });
    created.push({ office: o.role, name, email, password });
  }

  const funds = await db.fund.count();
  const accounts = await db.account.count();

  console.log("");
  console.log("Done.");
  console.log(`  membership forms kept : ${kept}`);
  console.log(`  funds                 : ${funds}`);
  console.log(`  accounts              : ${accounts}`);
  console.log(`  members               : 0`);
  console.log("");
  console.log("Accounts created:");
  for (const c of created) {
    console.log(`  ${c.office.padEnd(13)} ${c.email.padEnd(40)} ${c.name}`);
  }
  console.log("");
  console.log("Everyone should change their password after the first sign-in.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
