import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  }),
});

const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const round = (n: number) => Math.round(n * 100) / 100;

async function main() {
  console.log("Seeding…");

  // ── wipe (dev only) ───────────────────────────────────────────────
  await db.$transaction([
    db.verification.deleteMany(),
    db.stocktake.deleteMany(),
    db.asset.deleteMany(),
    db.attendanceEntry.deleteMany(),
    db.attendanceRegister.deleteMany(),
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
    db.ministry.deleteMany(),
    db.interest.deleteMany(),
    db.account.deleteMany(),
    db.fund.deleteMany(),
    db.auditLog.deleteMany(),
    db.user.deleteMany(),
    db.settings.deleteMany(),
  ]);

  // ── settings ──────────────────────────────────────────────────────
  await db.settings.create({
    data: {
      id: 1,
      churchName: "Victory in Christ",
      branchName: "Mamelodi Branch",
      addressLine1: "Stand 4471, Tsamaya Avenue",
      city: "Mamelodi East",
      province: "Gauteng",
      postalCode: "0122",
      phone: "012 805 0000",
      email: "office@victoryinchrist.org.za",
      isNpoRegistered: true,
      npoNumber: "123-456 NPO",
      financialYearStartMonth: 3,
      titheOutPercent: 10,
      mainMinistryName: "Victory in Christ Main Ministry",
      capitalisationThreshold: 2000,
      baptismCertificateText:
        "This is to certify that {name}, having professed faith in the Lord Jesus Christ, was baptised in the name of the Father, and of the Son, and of the Holy Spirit.",
    },
  });

  // ── users ─────────────────────────────────────────────────────────
  const pw = await bcrypt.hash("vic2026", 10);
  await db.user.createMany({
    data: [
      { email: "admin@vic.org", name: "Paul Ndlovu", passwordHash: pw, role: "ADMIN" },
      { email: "treasurer@vic.org", name: "Grace Mokoena", passwordHash: pw, role: "TREASURER" },
      { email: "secretary@vic.org", name: "Thandi Sithole", passwordHash: pw, role: "SECRETARY" },
      { email: "pastor@vic.org", name: "Ps. Samuel Dube", passwordHash: pw, role: "PASTOR" },
    ],
  });
  const admin = await db.user.findFirstOrThrow({ where: { role: "ADMIN" } });
  const treasurer = await db.user.findFirstOrThrow({ where: { role: "TREASURER" } });

  // ── funds ─────────────────────────────────────────────────────────
  const seedNow = new Date();
  const fundOpeningDate =
    seedNow.getMonth() >= 2
      ? new Date(seedNow.getFullYear(), 2, 1)
      : new Date(seedNow.getFullYear() - 1, 2, 1);
  const fundSpec = [
    { code: "GEN", name: "General / Operating", fundClass: "UNRESTRICTED", openingBalance: 42500, sortOrder: 1 },
    { code: "BLD", name: "Building Fund", fundClass: "TEMPORARILY_RESTRICTED", openingBalance: 118000, sortOrder: 2 },
    { code: "BEN", name: "Benevolence (Poor Fund)", fundClass: "TEMPORARILY_RESTRICTED", openingBalance: 9800, is18aEligible: true, sortOrder: 3 },
    { code: "FEED", name: "Children Feeding Scheme", fundClass: "TEMPORARILY_RESTRICTED", openingBalance: 15400, is18aEligible: true, sortOrder: 4 },
    { code: "YTH", name: "Youth Ministry", fundClass: "TEMPORARILY_RESTRICTED", openingBalance: 6200, sortOrder: 5 },
    { code: "MIS", name: "Missions & Outreach", fundClass: "TEMPORARILY_RESTRICTED", openingBalance: 11300, sortOrder: 6 },
  ] as const;

  const funds: Record<string, string> = {};
  for (const f of fundSpec) {
    const created = await db.fund.create({
      data: {
        code: f.code,
        name: f.name,
        fundClass: f.fundClass,
        openingBalance: f.openingBalance,
        openingDate: fundOpeningDate,
        is18aEligible: "is18aEligible" in f ? f.is18aEligible : false,
        sortOrder: f.sortOrder,
      },
    });
    funds[f.code] = created.id;
  }

  // ── chart of accounts ─────────────────────────────────────────────
  // Every expense category named in the brief appears here.
  const accountSpec = [
    // assets
    { code: "1010", name: "Cash on hand", type: "ASSET" },
    { code: "1020", name: "Bank — current account", type: "ASSET" },
    { code: "1030", name: "Bank — building savings", type: "ASSET" },
    { code: "1500", name: "Fixed assets at cost", type: "ASSET" },
    { code: "1590", name: "Accumulated depreciation", type: "ASSET" },
    // liabilities
    { code: "2010", name: "Accounts payable", type: "LIABILITY" },
    { code: "2020", name: "PAYE / UIF payable", type: "LIABILITY" },
    // net assets
    { code: "3100", name: "Unrestricted funds", type: "NET_ASSET" },
    { code: "3200", name: "Temporarily restricted funds", type: "NET_ASSET" },
    // income
    { code: "4010", name: "Tithes", type: "INCOME" },
    { code: "4020", name: "General offerings", type: "INCOME" },
    { code: "4030", name: "Thanksgiving & special offerings", type: "INCOME" },
    { code: "4040", name: "Building fund donations", type: "INCOME" },
    { code: "4050", name: "Missions donations", type: "INCOME" },
    { code: "4060", name: "Designated donations", type: "INCOME" },
    { code: "4070", name: "Dalmada fundraising", type: "INCOME" },
    { code: "4075", name: "Registration fees", type: "INCOME" },
    { code: "4080", name: "Interest income", type: "INCOME" },
    { code: "4090", name: "Other income", type: "INCOME" },
    // expenses — from the brief
    { code: "5010", name: "Pastors' stipend", type: "EXPENSE" },
    { code: "5015", name: "Honorarium — guest pastors", type: "EXPENSE" },
    { code: "5020", name: "Housekeeper wages", type: "EXPENSE" },
    { code: "5025", name: "Cleaners wages", type: "EXPENSE" },
    { code: "5030", name: "Band & worship team", type: "EXPENSE" },
    { code: "5035", name: "Music and media", type: "EXPENSE" },
    { code: "5040", name: "Electricity & water", type: "EXPENSE" },
    { code: "5045", name: "Transport", type: "EXPENSE" },
    { code: "5050", name: "Repairs & maintenance", type: "EXPENSE" },
    { code: "5055", name: "Cleaning materials", type: "EXPENSE" },
    { code: "5060", name: "Catering & hospitality", type: "EXPENSE" },
    { code: "5065", name: "Children feeding scheme", type: "EXPENSE" },
    { code: "5070", name: "Appreciations & services", type: "EXPENSE" },
    { code: "5075", name: "Offering to other churches", type: "EXPENSE" },
    { code: "5080", name: "Tithe to main ministry", type: "EXPENSE" },
    { code: "5085", name: "Registration & affiliation fees", type: "EXPENSE" },
    { code: "5090", name: "Printing & stationery", type: "EXPENSE" },
    { code: "5095", name: "Bank charges", type: "EXPENSE" },
    { code: "5100", name: "Depreciation", type: "EXPENSE" },
    { code: "5110", name: "Loss on asset write-off", type: "EXPENSE" },
  ] as const;

  const acc: Record<string, string> = {};
  for (const a of accountSpec) {
    const created = await db.account.create({
      data: { code: a.code, name: a.name, type: a.type },
    });
    acc[a.code] = created.id;
  }

  // ── ministries & interests ────────────────────────────────────────
  const ministryNames = ["Children", "Youth", "Young Adults", "Adults", "Women's Fellowship", "Men's Fellowship", "Ushering", "Media"];
  const ministries: string[] = [];
  for (const n of ministryNames) {
    const m = await db.ministry.create({ data: { name: n } });
    ministries.push(m.id);
  }
  const interestNames = ["Choir", "Teaching", "Ushering", "Music", "Outreach", "Prayer", "Media", "Catering"];
  const interests: string[] = [];
  for (const n of interestNames) {
    const i = await db.interest.create({ data: { name: n } });
    interests.push(i.id);
  }

  // ── members ───────────────────────────────────────────────────────
  const firstNames = ["Thabo","Nomsa","Sipho","Lerato","Mandla","Zanele","Kagiso","Palesa","Tshepo","Naledi","Bongani","Refilwe","Lucky","Dineo","Solomon","Precious","Andile","Boitumelo","Kabelo","Mpho","Themba","Nokuthula","Jabu","Ayanda","Sibusiso","Lindiwe","Katlego","Puleng","Neo","Tumelo","Gift","Nthabiseng","Vusi","Khanyi","Oscar","Zodwa","Peter","Basetsana","Simon","Rethabile"];
  const surnames = ["Ndlovu","Mokoena","Sithole","Dube","Nkosi","Mahlangu","Molefe","Khumalo","Zulu","Mabaso","Radebe","Mnguni","Tshabalala","Mthembu","Baloyi","Sibanda","Motaung","Ngwenya","Maluleke","Sekhukhune"];
  const cities = ["Mamelodi East","Mamelodi West","Nellmapius","Silverton","Eersterust"];

  const memberIds: string[] = [];
  for (let i = 0; i < 68; i++) {
    const first = pick(firstNames);
    const sur = pick(surnames);
    const gender = Math.random() > 0.45 ? "FEMALE" : "MALE";
    const age = Math.floor(rand(16, 74));
    const married = age > 26 && Math.random() > 0.42;

    const m = await db.member.create({
      data: {
        memberNumber: `VIC-${String(i + 1).padStart(4, "0")}`,
        surname: sur,
        fullName: `${first} ${sur}`,
        dob: new Date(seedNow.getFullYear() - age, Math.floor(rand(0, 12)), Math.floor(rand(1, 28))),
        gender,
        maritalStatus: married ? "MARRIED" : age > 60 && Math.random() > 0.6 ? "WIDOWED" : "SINGLE",
        status: Math.random() > 0.08 ? "ACTIVE" : "INACTIVE",
        addressLine: `${Math.floor(rand(100, 9999))} ${pick(["Tsamaya","Hinterland","Serapeng","Mokone","Waltloo"])} Street`,
        city: pick(cities),
        province: "Gauteng",
        postalCode: pick(["0122", "0101", "0184"]),
        phone: `0${pick(["6","7","8"])}${Math.floor(rand(10000000, 99999999))}`,
        email: Math.random() > 0.3 ? `${first.toLowerCase()}.${sur.toLowerCase()}@gmail.com` : null,
        children: married && Math.random() > 0.4 ? String(Math.floor(rand(1, 5))) : null,
        salvationDate: Math.random() > 0.2 ? new Date(seedNow.getFullYear() - Math.floor(rand(1, 22)), Math.floor(rand(0, 12)), Math.floor(rand(1, 28))) : null,
        baptismDate: Math.random() > 0.4 ? new Date(seedNow.getFullYear() - Math.floor(rand(1, 18)), Math.floor(rand(0, 12)), Math.floor(rand(1, 28))) : null,
        previousChurch: Math.random() > 0.65 ? pick(["Zion Christian Church","Rhema Bible Church","Methodist Church SA","Apostolic Faith Mission","None"]) : null,
        registrationDate: new Date(seedNow.getFullYear() - Math.floor(rand(0, 9)), Math.floor(rand(0, 12)), Math.floor(rand(1, 28))),
        prayerRequests: Math.random() > 0.75 ? pick(["Employment for my son","Healing for my mother","Wisdom in my studies","Safe travels for the family","Restoration in my marriage"]) : null,
      },
    });
    memberIds.push(m.id);

    await db.memberMinistry.create({
      data: { memberId: m.id, ministryId: pick(ministries) },
    });
    const nInterests = Math.floor(rand(1, 3));
    const chosen = new Set<string>();
    for (let k = 0; k < nInterests; k++) chosen.add(pick(interests));
    for (const iid of chosen) {
      await db.memberInterest.create({ data: { memberId: m.id, interestId: iid } });
    }
  }

  // ── offering batches + contributions + income transactions ────────
  // Anchor everything to the real current date so the dashboard always has a
  // populated "this month", whenever the seed is run.
  const today = new Date();
  const fyStart = (() => {
    const y = today.getFullYear();
    // financial year starts 1 March
    return today.getMonth() >= 2 ? new Date(y, 2, 1) : new Date(y - 1, 2, 1);
  })();

  const incomeAccounts = [
    { code: "4010", fund: "GEN", weight: 0.5 },
    { code: "4020", fund: "GEN", weight: 0.25 },
    { code: "4030", fund: "GEN", weight: 0.07 },
    { code: "4040", fund: "BLD", weight: 0.08 },
    { code: "4050", fund: "MIS", weight: 0.04 },
    { code: "4060", fund: "BEN", weight: 0.03 },
    { code: "4060", fund: "FEED", weight: 0.03 },
  ];

  let batchNo = 1;
  for (let d = new Date(fyStart); d <= today; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0) continue; // Sundays
    const serviceDate = new Date(d);

    const batch = await db.batch.create({
      data: {
        batchNumber: `B${serviceDate.getFullYear()}-${String(batchNo++).padStart(3, "0")}`,
        serviceDate,
        serviceName: "Sunday Service",
        status: "POSTED",
        counter1Name: "Grace Mokoena",
        counter2Name: pick(["Thandi Sithole", "Lucky Radebe", "Precious Zulu"]),
        countedAt: serviceDate,
        createdById: treasurer.id,
        reviewedById: admin.id,
        reviewedAt: serviceDate,
        postedAt: serviceDate,
      },
    });

    // attributed giving from a sample of members
    const givers = memberIds.filter(() => Math.random() > 0.62);
    let total = 0;
    for (const gid of givers) {
      const spec = pick(incomeAccounts);
      const amount = round(rand(50, 900));
      total += amount;
      await db.contributionLine.create({
        data: {
          batchId: batch.id,
          memberId: gid,
          fundId: funds[spec.fund],
          accountId: acc[spec.code],
          amount,
          method: Math.random() > 0.55 ? "CASH" : "EFT",
          reference: Math.random() > 0.7 ? `ENV${Math.floor(rand(100, 999))}` : null,
        },
      });
    }
    // loose cash
    const loose = round(rand(400, 2200));
    total += loose;
    await db.contributionLine.create({
      data: {
        batchId: batch.id,
        fundId: funds.GEN,
        accountId: acc["4020"],
        amount: loose,
        method: "CASH",
        note: "Loose offering",
      },
    });

    await db.batch.update({
      where: { id: batch.id },
      data: { expectedTotal: round(total) },
    });

    // post the batch to the ledger, grouped by fund+account
    const lines = await db.contributionLine.findMany({ where: { batchId: batch.id } });
    const grouped = new Map<string, number>();
    for (const l of lines) {
      const k = `${l.fundId}|${l.accountId}`;
      grouped.set(k, (grouped.get(k) ?? 0) + l.amount);
    }
    for (const [k, amount] of grouped) {
      const [fundId, accountId] = k.split("|");
      await db.transaction.create({
        data: {
          date: serviceDate,
          type: "RECEIPT",
          description: `Offering — ${batch.batchNumber}`,
          amount: round(amount),
          method: "CASH",
          fundId,
          accountId,
          batchId: batch.id,
          createdById: treasurer.id,
          postedAt: serviceDate,
        },
      });
    }
  }

  // ── expenses ──────────────────────────────────────────────────────
  const monthlyExpenses = [
    { code: "5010", fund: "GEN", min: 9000, max: 12000, payee: "Ps. Samuel Dube", note: "Monthly stipend" },
    { code: "5020", fund: "GEN", min: 2800, max: 3200, payee: "M. Baloyi", note: "Housekeeper" },
    { code: "5025", fund: "GEN", min: 2200, max: 2600, payee: "Cleaning team", note: "Cleaners" },
    { code: "5030", fund: "GEN", min: 1800, max: 3500, payee: "Worship team", note: "Band" },
    { code: "5040", fund: "GEN", min: 2400, max: 4800, payee: "City of Tshwane", note: "Electricity & water" },
    { code: "5045", fund: "GEN", min: 900, max: 2400, payee: "Various", note: "Transport" },
    { code: "5055", fund: "GEN", min: 350, max: 900, payee: "Makro", note: "Cleaning materials" },
    { code: "5065", fund: "FEED", min: 2500, max: 4500, payee: "Boxer Superstores", note: "Children feeding scheme" },
    { code: "5095", fund: "GEN", min: 180, max: 260, payee: "FNB", note: "Bank charges" },
  ];

  const occasionalExpenses = [
    { code: "5015", fund: "GEN", min: 800, max: 2500, payee: "Guest minister", note: "Honorarium" },
    { code: "5035", fund: "GEN", min: 600, max: 3800, payee: "Media supplies", note: "Music and media" },
    { code: "5050", fund: "BLD", min: 1200, max: 9500, payee: "Local contractor", note: "Repairs" },
    { code: "5060", fund: "GEN", min: 900, max: 5200, payee: "Catering", note: "Catering" },
    { code: "5070", fund: "GEN", min: 700, max: 3000, payee: "Various", note: "Appreciation — elders" },
    { code: "5075", fund: "MIS", min: 500, max: 2500, payee: "Partner church", note: "Offering to another church" },
    { code: "5085", fund: "GEN", min: 350, max: 1500, payee: "NPO Directorate", note: "Registration fee" },
    { code: "5090", fund: "GEN", min: 250, max: 1100, payee: "PNA", note: "Printing" },
  ];

  for (let m = new Date(fyStart); m <= today; m.setMonth(m.getMonth() + 1)) {
    const month = new Date(m);
    const payDay = new Date(month.getFullYear(), month.getMonth(), 25);
    if (payDay > today) continue;

    for (const e of monthlyExpenses) {
      await db.transaction.create({
        data: {
          date: payDay,
          type: "PAYMENT",
          description: e.note,
          payee: e.payee,
          amount: round(rand(e.min, e.max)),
          method: "EFT",
          fundId: funds[e.fund],
          accountId: acc[e.code],
          createdById: treasurer.id,
          postedAt: payDay,
        },
      });
    }

    // tithe to main ministry — 10% of the month's receipts
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);
    const receipts = await db.transaction.findMany({
      where: { type: "RECEIPT", date: { gte: month, lte: monthEnd } },
      select: { amount: true },
    });
    const gross = receipts.reduce((s, r) => s + r.amount, 0);
    if (gross > 0) {
      await db.transaction.create({
        data: {
          date: new Date(month.getFullYear(), month.getMonth(), 28),
          type: "PAYMENT",
          description: "Tithe to main ministry (10%)",
          payee: "Victory in Christ Main Ministry",
          amount: round(gross * 0.1),
          method: "EFT",
          fundId: funds.GEN,
          accountId: acc["5080"],
          createdById: treasurer.id,
          postedAt: new Date(month.getFullYear(), month.getMonth(), 28),
        },
      });
    }

    for (const e of occasionalExpenses) {
      if (Math.random() > 0.55) continue;
      const day = new Date(month.getFullYear(), month.getMonth(), Math.floor(rand(2, 27)));
      if (day > today) continue;
      await db.transaction.create({
        data: {
          date: day,
          type: "PAYMENT",
          description: e.note,
          payee: e.payee,
          amount: round(rand(e.min, e.max)),
          method: pick(["EFT", "CASH"]),
          fundId: funds[e.fund],
          accountId: acc[e.code],
          createdById: treasurer.id,
          postedAt: day,
        },
      });
    }
  }

  // dalmada fundraising — once per year
  await db.transaction.create({
    data: {
      date: new Date(today.getFullYear(), today.getMonth() - 2, 18),
      type: "RECEIPT",
      description: "Dalmada annual fundraising",
      amount: 47850,
      method: "CASH",
      fundId: funds.BLD,
      accountId: acc["4070"],
      createdById: treasurer.id,
      postedAt: new Date(today.getFullYear(), today.getMonth() - 2, 18),
    },
  });

  // ── budget ────────────────────────────────────────────────────────
  const budget = await db.budget.create({
    data: {
      name: `${fyStart.getFullYear()}/${String((fyStart.getFullYear() + 1) % 100).padStart(2, "0")} Annual Budget`,
      yearStart: fyStart,
      yearEnd: new Date(fyStart.getFullYear() + 1, 1, 28, 23, 59, 59),
    },
  });
  const budgetSpec: [string, number][] = [
    ["4010", 620000], ["4020", 310000], ["4030", 86000], ["4040", 120000],
    ["4070", 50000], ["5010", 132000], ["5020", 36000], ["5025", 29000],
    ["5030", 32000], ["5040", 44000], ["5045", 20000], ["5050", 60000],
    ["5055", 8000], ["5060", 30000], ["5065", 44000], ["5070", 18000],
    ["5080", 105000], ["5090", 9000], ["5095", 2800],
  ];
  for (const [code, amount] of budgetSpec) {
    await db.budgetLine.create({
      data: { budgetId: budget.id, accountId: acc[code], amount },
    });
  }

  // ── assets ────────────────────────────────────────────────────────
  const assetSpec = [
    ["Yamaha Stage Piano P-125", "MUSICAL_AND_SOUND", 18500, "Main Sanctuary", 8],
    ["Pearl Export Drum Kit", "MUSICAL_AND_SOUND", 22000, "Main Sanctuary", 10],
    ["Behringer X32 Mixing Desk", "MUSICAL_AND_SOUND", 34000, "Sound Booth", 8],
    ["JBL EON615 Speakers (pair)", "MUSICAL_AND_SOUND", 16800, "Main Sanctuary", 7],
    ["Shure SM58 Microphones (×6)", "MUSICAL_AND_SOUND", 7200, "Sound Booth", 5],
    ["Fender Bass Guitar", "MUSICAL_AND_SOUND", 9500, "Main Sanctuary", 10],
    ["Epson EB-X49 Projector", "IT_EQUIPMENT", 11200, "Main Sanctuary", 5],
    ["Dell OptiPlex Desktop", "IT_EQUIPMENT", 12400, "Church Office", 5],
    ["HP LaserJet Pro Printer", "IT_EQUIPMENT", 4800, "Church Office", 4],
    ["Canon EOS 250D Camera", "IT_EQUIPMENT", 13500, "Media Room", 6],
    ["Plastic Chairs (×200)", "FURNITURE_AND_FITTINGS", 32000, "Main Sanctuary", 10],
    ["Wooden Pulpit", "FURNITURE_AND_FITTINGS", 6500, "Main Sanctuary", 15],
    ["Office Desk & Chairs", "FURNITURE_AND_FITTINGS", 8900, "Church Office", 10],
    ["Steel Storage Cabinets (×3)", "FURNITURE_AND_FITTINGS", 5400, "Storeroom", 12],
    ["Industrial Gas Stove", "KITCHEN_EQUIPMENT", 14200, "Kitchen", 10],
    ["Chest Freezer 300L", "KITCHEN_EQUIPMENT", 7800, "Kitchen", 8],
    ["Catering Pots & Urns", "KITCHEN_EQUIPMENT", 4600, "Kitchen", 6],
    ["Toyota Quantum (14-seater)", "VEHICLES", 285000, "Off-site", 12],
    ["Sunday School Library", "BOOKS_AND_MEDIA", 6200, "Children's Room", 8],
    ["Marquee Tent 6×12m", "OTHER", 18900, "Storeroom", 7],
  ] as const;

  let assetNo = 1;
  const assetIds: string[] = [];
  for (const [desc, category, cost, location, life] of assetSpec) {
    const a = await db.asset.create({
      data: {
        assetCode: `VIC-${String(assetNo++).padStart(4, "0")}`,
        description: desc,
        category,
        acquisitionDate: new Date(seedNow.getFullYear() - Math.floor(rand(0, 7)), Math.floor(rand(0, 12)), Math.floor(rand(1, 28))),
        acquisitionCost: cost,
        acquisitionMethod: Math.random() > 0.82 ? "DONATED" : "PURCHASED",
        location,
        usefulLifeYears: life,
        residualValue: round(cost * 0.05),
        insuredValue: round(cost * 1.15),
        condition: pick(["NEW", "GOOD", "GOOD", "GOOD", "FAIR", "POOR"]),
        status: "IN_USE",
        fundId: Math.random() > 0.7 ? funds.BLD : funds.GEN,
        accountId: acc["1500"],
        custodianId: Math.random() > 0.5 ? pick(memberIds) : null,
      },
    });
    assetIds.push(a.id);
  }

  // a couple of written-off assets, with council approval references
  await db.asset.create({
    data: {
      assetCode: `VIC-${String(assetNo++).padStart(4, "0")}`,
      description: "Old Sound Amplifier (Peavey)",
      category: "MUSICAL_AND_SOUND",
      acquisitionDate: new Date(seedNow.getFullYear() - 10, 4, 12),
      acquisitionCost: 8400,
      location: "Storeroom",
      usefulLifeYears: 8,
      condition: "UNSERVICEABLE",
      status: "WRITTEN_OFF",
      disposalDate: new Date(today.getFullYear(), today.getMonth() - 4, 30),
      disposalMethod: "SCRAPPED",
      disposalProceeds: 0,
      approvalReference: `Council Minute ${today.getFullYear()}/04`,
      approvedBy: "Church Council",
      disposalNotes: "Beyond economical repair; confirmed at 2026 stocktake.",
      fundId: funds.GEN,
      accountId: acc["1500"],
    },
  });
  await db.asset.create({
    data: {
      assetCode: `VIC-${String(assetNo++).padStart(4, "0")}`,
      description: "Acer Laptop (Office)",
      category: "IT_EQUIPMENT",
      acquisitionDate: new Date(seedNow.getFullYear() - 8, 1, 20),
      acquisitionCost: 9800,
      location: "Church Office",
      usefulLifeYears: 5,
      condition: "UNSERVICEABLE",
      status: "DISPOSED",
      disposalDate: new Date(today.getFullYear(), today.getMonth() - 3, 14),
      disposalMethod: "SOLD",
      disposalProceeds: 800,
      approvalReference: `Council Minute ${today.getFullYear()}/05`,
      approvedBy: "Church Council",
      fundId: funds.GEN,
      accountId: acc["1500"],
    },
  });

  // ── stocktake ─────────────────────────────────────────────────────
  const stocktake = await db.stocktake.create({
    data: {
      name: `${today.getFullYear()} Annual Stocktake`,
      cutoffDate: new Date(today.getFullYear(), today.getMonth() - 1, 28),
      scopeNote: "All locations",
      status: "IN_PROGRESS",
    },
  });
  for (const aid of assetIds.slice(0, 13)) {
    await db.verification.create({
      data: {
        stocktakeId: stocktake.id,
        assetId: aid,
        outcome: Math.random() > 0.12 ? "FOUND" : pick(["MOVED", "DAMAGED"]),
        condition: pick(["GOOD", "GOOD", "FAIR"]),
        verifiedById: treasurer.id,
      },
    });
    await db.asset.update({
      where: { id: aid },
      data: { lastVerifiedAt: new Date(today.getFullYear(), today.getMonth() - 1, 20), lastVerifiedBy: "Grace Mokoena" },
    });
  }

  // ── baptisms ──────────────────────────────────────────────────────
  const baptised = memberIds.slice(0, 14);
  let regNo = 1;
  for (let i = 0; i < baptised.length; i++) {
    const member = await db.member.findUniqueOrThrow({ where: { id: baptised[i] } });
    const isDone = i < 9;
    await db.baptism.create({
      data: {
        memberId: member.id,
        fullName: member.fullName,
        dob: member.dob,
        programmeYear: today.getFullYear(),
        status: isDone ? "BAPTISED" : pick(["CANDIDATE", "CLASS_IN_PROGRESS", "APPROVED"]),
        classStartDate: new Date(today.getFullYear(), Math.max(0, today.getMonth() - 4), 10),
        baptismDate: isDone ? new Date(today.getFullYear(), Math.max(0, today.getMonth() - 2), 12) : null,
        placeOfBaptism: isDone ? "Victory in Christ, Mamelodi East" : null,
        mode: isDone ? "Immersion" : null,
        officiant: isDone ? "Ps. Samuel Dube" : null,
        witness1: isDone ? "Thandi Sithole" : null,
        witness2: isDone ? "Lucky Radebe" : null,
        scriptureVerse: isDone ? "Romans 6:4" : null,
        registerNumber: isDone ? `BAP-${today.getFullYear()}-${String(regNo++).padStart(3, "0")}` : null,
        certificateIssuedAt: isDone && i < 6 ? new Date(today.getFullYear(), Math.max(0, today.getMonth() - 2), 19) : null,
        certificateIssuedBy: isDone && i < 6 ? "Thandi Sithole" : null,
      },
    });
  }

  // ── planner events ────────────────────────────────────────────────
  const events: { title: string; category: string; date: Date; endsAt?: Date; allDay?: boolean; location?: string; leader?: string }[] = [];

  const plannerStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const plannerEnd = new Date(today.getFullYear(), today.getMonth() + 4, 0);
  for (let d = new Date(plannerStart); d <= plannerEnd; d.setDate(d.getDate() + 1)) {
    const day = new Date(d);
    if (day.getDay() === 0) {
      events.push({ title: "Sunday Service", category: "SERVICE", date: new Date(day.setHours(9, 0)), location: "Main Sanctuary", leader: "Ps. Samuel Dube" });
    }
    if (day.getDay() === 3) {
      events.push({ title: "Midweek Bible Study", category: "MEETING", date: new Date(new Date(day).setHours(18, 30)), location: "Main Sanctuary" });
    }
    if (day.getDay() === 5) {
      events.push({ title: "Youth Night", category: "YOUTH", date: new Date(new Date(day).setHours(18, 0)), location: "Youth Hall" });
    }
  }

  const M = today.getMonth();
  const Y = today.getFullYear();
  events.push(
    { title: "Church Council Meeting", category: "MEETING", date: new Date(Y, M, 12, 17, 0), location: "Church Office" },
    { title: "Baptism Service", category: "BAPTISM", date: new Date(Y, M, 27, 10, 0), location: "Main Sanctuary", leader: "Ps. Samuel Dube" },
    { title: "Women's Fellowship Breakfast", category: "WOMEN", date: new Date(Y, M + 1, 3, 8, 0), location: "Church Hall" },
    { title: "Community Outreach — Nellmapius", category: "OUTREACH", date: new Date(Y, M + 1, 10, 9, 0), location: "Nellmapius" },
    { title: "Dalmada Fundraising Day", category: "FUNDRAISING", date: new Date(Y, M + 1, 24, 8, 0), location: "Church Grounds", leader: "Grace Mokoena" },
    { title: "Annual Stocktake", category: "MEETING", date: new Date(Y, M + 2, 7, 9, 0), location: "All locations" },
    { title: "Men's Conference", category: "MEN", date: new Date(Y, M + 2, 14, 8, 0), location: "Church Hall" },
    { title: "Children's Christmas Party", category: "CHILDREN", date: new Date(Y, M + 3, 12, 10, 0), location: "Church Grounds" },
    { title: "Watchnight Service", category: "SERVICE", date: new Date(Y, 11, 31, 22, 0), location: "Main Sanctuary" },
  );

  for (const e of events) {
    await db.event.create({
      data: {
        title: e.title,
        category: e.category as never,
        startsAt: e.date,
        endsAt: e.endsAt,
        allDay: e.allDay ?? false,
        location: e.location,
        leader: e.leader,
      },
    });
  }

  // ── attendance ────────────────────────────────────────────────────
  const attStart = new Date(today.getFullYear(), today.getMonth() - 3, 1);
  for (let d = new Date(attStart); d <= today; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0) continue;
    await db.attendanceRegister.create({
      data: {
        serviceDate: new Date(d),
        serviceName: "Sunday Service",
        headcount: Math.floor(rand(58, 112)),
      },
    });
  }

  const counts = await Promise.all([
    db.member.count(), db.transaction.count(), db.asset.count(),
    db.batch.count(), db.event.count(), db.baptism.count(),
  ]);
  console.log(
    `Seeded — members: ${counts[0]}, transactions: ${counts[1]}, assets: ${counts[2]}, batches: ${counts[3]}, events: ${counts[4]}, baptisms: ${counts[5]}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
