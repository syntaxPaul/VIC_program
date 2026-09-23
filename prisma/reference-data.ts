/**
 * The church's structure: funds, chart of accounts, ministries and areas of
 * interest.
 *
 * This is NOT demo data. It is what a real installation needs in order to
 * record anything at all, which is why it lives apart from the seed and is
 * applied both when seeding a demo and when going live.
 */

export const FUNDS = [
  { code: "GEN",  name: "General / Operating",      fundClass: "UNRESTRICTED",           is18aEligible: false, sortOrder: 1 },
  { code: "BLD",  name: "Building Fund",            fundClass: "TEMPORARILY_RESTRICTED", is18aEligible: false, sortOrder: 2 },
  { code: "BEN",  name: "Benevolence (Poor Fund)",  fundClass: "TEMPORARILY_RESTRICTED", is18aEligible: true,  sortOrder: 3 },
  { code: "FEED", name: "Children Feeding Scheme",  fundClass: "TEMPORARILY_RESTRICTED", is18aEligible: true,  sortOrder: 4 },
  { code: "YTH",  name: "Youth Ministry",           fundClass: "TEMPORARILY_RESTRICTED", is18aEligible: false, sortOrder: 5 },
  { code: "MIS",  name: "Missions & Outreach",      fundClass: "TEMPORARILY_RESTRICTED", is18aEligible: false, sortOrder: 6 },
] as const;

/**
 * Standard 1000-5000 block structure. Every expense category the church
 * actually spends on has its own account.
 */
export const ACCOUNTS = [
  { code: "1010", name: "Cash on hand",                    type: "ASSET" },
  { code: "1020", name: "Bank — current account",          type: "ASSET" },
  { code: "1030", name: "Bank — building savings",         type: "ASSET" },
  { code: "1500", name: "Fixed assets at cost",            type: "ASSET" },
  { code: "1590", name: "Accumulated depreciation",        type: "ASSET" },

  { code: "2010", name: "Accounts payable",                type: "LIABILITY" },
  { code: "2020", name: "PAYE / UIF payable",              type: "LIABILITY" },

  { code: "3100", name: "Unrestricted funds",              type: "NET_ASSET" },
  { code: "3200", name: "Temporarily restricted funds",    type: "NET_ASSET" },

  { code: "4010", name: "Tithes",                          type: "INCOME" },
  { code: "4020", name: "General offerings",               type: "INCOME" },
  { code: "4030", name: "Thanksgiving & special offerings", type: "INCOME" },
  { code: "4040", name: "Building fund donations",         type: "INCOME" },
  { code: "4050", name: "Missions donations",              type: "INCOME" },
  { code: "4060", name: "Designated donations",            type: "INCOME" },
  { code: "4070", name: "Dalmada fundraising",             type: "INCOME" },
  { code: "4075", name: "Registration fees",               type: "INCOME" },
  { code: "4080", name: "Interest income",                 type: "INCOME" },
  { code: "4090", name: "Other income",                    type: "INCOME" },

  { code: "5010", name: "Pastors' stipend",                type: "EXPENSE" },
  { code: "5015", name: "Honorarium — guest pastors",      type: "EXPENSE" },
  { code: "5020", name: "Housekeeper wages",               type: "EXPENSE" },
  { code: "5025", name: "Cleaners wages",                  type: "EXPENSE" },
  { code: "5030", name: "Band & worship team",             type: "EXPENSE" },
  { code: "5035", name: "Music and media",                 type: "EXPENSE" },
  { code: "5040", name: "Electricity & water",             type: "EXPENSE" },
  { code: "5045", name: "Transport",                       type: "EXPENSE" },
  { code: "5050", name: "Repairs & maintenance",           type: "EXPENSE" },
  { code: "5055", name: "Cleaning materials",              type: "EXPENSE" },
  { code: "5060", name: "Catering & hospitality",          type: "EXPENSE" },
  { code: "5065", name: "Children feeding scheme",         type: "EXPENSE" },
  { code: "5070", name: "Appreciations & services",        type: "EXPENSE" },
  { code: "5075", name: "Offering to other churches",      type: "EXPENSE" },
  { code: "5080", name: "Tithe to main ministry",          type: "EXPENSE" },
  { code: "5085", name: "Registration & affiliation fees", type: "EXPENSE" },
  { code: "5090", name: "Printing & stationery",           type: "EXPENSE" },
  { code: "5095", name: "Bank charges",                    type: "EXPENSE" },
  { code: "5100", name: "Depreciation",                    type: "EXPENSE" },
  { code: "5110", name: "Loss on asset write-off",         type: "EXPENSE" },
] as const;

export const MINISTRIES = [
  "Children", "Youth", "Young Adults", "Adults",
  "Women's Fellowship", "Men's Fellowship", "Ushering", "Media",
] as const;

export const INTERESTS = [
  "Choir", "Teaching", "Ushering", "Music",
  "Outreach", "Prayer", "Media", "Catering",
] as const;

/** 1 March of the current financial year. */
export function financialYearStart(now = new Date(), startMonth = 3) {
  const m = startMonth - 1;
  return now.getMonth() >= m
    ? new Date(now.getFullYear(), m, 1)
    : new Date(now.getFullYear() - 1, m, 1);
}

/**
 * The church's departments — each runs its own work and asks for its own
 * budget. Leaders are filled in by the administrator; they are people, not
 * reference data.
 */
export const DEPARTMENTS = [
  { code: "DISC", name: "Discipleship", description: "Baptism classes, new believers and consecrations", sortOrder: 1 },
  { code: "CHILD", name: "Children's Ministry", description: "Children's church, Sunday school and holiday clubs", sortOrder: 2 },
  { code: "YOUTH", name: "Youth Ministry", description: "Intermediate, youth, young adults and men, and their word study", sortOrder: 3 },
  { code: "WELF", name: "Health & Welfare", description: "Food, clothing and care for members and the community", sortOrder: 4 },
  { code: "EVAN", name: "Evangelism", description: "Outreach, crusades and follow-up", sortOrder: 5 },
  { code: "MUSIC", name: "Music & Media", description: "Worship team, sound and media", sortOrder: 6 },
  { code: "WOMEN", name: "Women's Fellowship", description: null, sortOrder: 7 },
  { code: "MEN", name: "Men's Fellowship", description: null, sortOrder: 8 },
  { code: "USHER", name: "Ushering & Hospitality", description: "Ushers, catering and welcome", sortOrder: 9 },
  { code: "ADMIN", name: "Administration", description: "The office, property and running costs", sortOrder: 10 },
] as const;

type MinimalDb = {
  fund: { upsert: (a: unknown) => Promise<unknown> };
  account: { upsert: (a: unknown) => Promise<unknown> };
  ministry: { upsert: (a: unknown) => Promise<unknown> };
  interest: { upsert: (a: unknown) => Promise<unknown> };
  department?: { upsert: (a: unknown) => Promise<unknown> };
};

/**
 * Creates anything missing and leaves anything that exists alone, so it is
 * safe to run against a live system. Opening balances are only set on
 * creation — an existing fund's balance is never overwritten.
 */
export async function ensureReferenceData(
  db: MinimalDb,
  opts: { openingDate?: Date } = {},
) {
  const openingDate = opts.openingDate ?? financialYearStart();

  for (const f of FUNDS) {
    await db.fund.upsert({
      where: { code: f.code },
      create: {
        code: f.code,
        name: f.name,
        fundClass: f.fundClass,
        is18aEligible: f.is18aEligible,
        sortOrder: f.sortOrder,
        openingBalance: 0,
        openingDate,
      },
      update: {},
    });
  }

  for (const a of ACCOUNTS) {
    await db.account.upsert({
      where: { code: a.code },
      create: { code: a.code, name: a.name, type: a.type },
      update: {},
    });
  }

  for (const name of MINISTRIES) {
    await db.ministry.upsert({ where: { name }, create: { name }, update: {} });
  }

  for (const name of INTERESTS) {
    await db.interest.upsert({ where: { name }, create: { name }, update: {} });
  }

  if (db.department) {
    for (const d of DEPARTMENTS) {
      await db.department.upsert({
        where: { code: d.code },
        create: { code: d.code, name: d.name, description: d.description, sortOrder: d.sortOrder },
        update: {},
      });
    }
  }

  return {
    funds: FUNDS.length,
    accounts: ACCOUNTS.length,
    ministries: MINISTRIES.length,
    interests: INTERESTS.length,
  };
}
