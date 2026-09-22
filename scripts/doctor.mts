/**
 * Why can nobody sign in?
 *
 *   npx tsx scripts/doctor.mts
 *
 * Connects with exactly the DATABASE_URL it is given and reports what is
 * actually in the users table, including whether a supplied password
 * verifies against the stored hash.
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set.");

// Never print the password, but do show which server and database.
const shown = url.replace(/:\/\/([^:]+):[^@]+@/, "://$1:***@");
console.log("connected to :", shown);

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const [users, members, funds, accounts] = await Promise.all([
  db.user.findMany({
    select: { email: true, name: true, role: true, isActive: true, passwordHash: true },
    orderBy: { email: "asc" },
  }),
  db.member.count(),
  db.fund.count(),
  db.account.count(),
]);

console.log("members      :", members);
console.log("funds        :", funds, "| accounts:", accounts);
console.log("users        :", users.length);

if (users.length === 0) {
  console.log("\nThere are no user accounts in THIS database.");
  console.log("Either the data was loaded somewhere else, or it has been cleared.");
} else {
  console.log("");
  for (const u of users) {
    console.log(`  ${u.email.padEnd(24)} ${u.role.padEnd(10)} ${u.isActive ? "active" : "DISABLED"}  hash ${u.passwordHash.slice(0, 7)}…`);
  }
}

const testEmail = process.env.TEST_EMAIL;
const testPassword = process.env.TEST_PASSWORD;
if (testEmail && testPassword) {
  console.log("");
  const u = await db.user.findUnique({ where: { email: testEmail.toLowerCase().trim() } });
  if (!u) {
    console.log(`"${testEmail}" is NOT in this database.`);
  } else {
    const ok = await bcrypt.compare(testPassword, u.passwordHash);
    console.log(`"${testEmail}" found; password ${ok ? "VERIFIES" : "does NOT match"}; account ${u.isActive ? "active" : "DISABLED"}.`);
  }
}

await db.$disconnect();
