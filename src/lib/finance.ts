import "server-only";
import { db } from "./db";
import { AccountType, TxType } from "@/generated/prisma";

/** Financial year running 1 March – end February by default (SARS convention). */
export function financialYearBounds(date: Date, startMonth = 3) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const startYear = m >= startMonth ? y : y - 1;
  const start = new Date(startYear, startMonth - 1, 1);
  const end = new Date(startYear + 1, startMonth - 1, 0, 23, 59, 59, 999);
  return { start, end, label: `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}` };
}

export function monthBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/** Months of the financial year in order, e.g. Mar → Feb. */
export function financialYearMonths(start: Date) {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    return {
      date: d,
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("en-ZA", { month: "short" }).format(d),
    };
  });
}

export type Period = { start: Date; end: Date };

const notDeleted = { deletedAt: null };

/** Total income and expenditure for a period, optionally scoped to a fund. */
export async function incomeExpenseTotals(period: Period, fundId?: string) {
  const rows = await db.transaction.findMany({
    where: {
      ...notDeleted,
      date: { gte: period.start, lte: period.end },
      type: { in: [TxType.RECEIPT, TxType.PAYMENT] },
      ...(fundId ? { fundId } : {}),
    },
    select: { amount: true, type: true },
  });

  let income = 0;
  let expense = 0;
  for (const r of rows) {
    if (r.type === TxType.RECEIPT) income += r.amount;
    else expense += r.amount;
  }
  return { income, expense, net: income - expense };
}

/** Income & Expenditure statement — grouped by account. */
export async function incomeExpenseStatement(period: Period, fundId?: string) {
  const rows = await db.transaction.findMany({
    where: {
      ...notDeleted,
      date: { gte: period.start, lte: period.end },
      type: { in: [TxType.RECEIPT, TxType.PAYMENT] },
      ...(fundId ? { fundId } : {}),
    },
    select: {
      amount: true,
      type: true,
      account: { select: { id: true, code: true, name: true, type: true } },
    },
  });

  const map = new Map<
    string,
    { code: string; name: string; type: AccountType; total: number }
  >();

  for (const r of rows) {
    const k = r.account.id;
    const cur =
      map.get(k) ??
      { code: r.account.code, name: r.account.name, type: r.account.type, total: 0 };
    cur.total += r.amount;
    map.set(k, cur);
  }

  const all = [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
  const income = all.filter((a) => a.type === AccountType.INCOME);
  const expenses = all.filter((a) => a.type === AccountType.EXPENSE);
  const totalIncome = income.reduce((s, a) => s + a.total, 0);
  const totalExpense = expenses.reduce((s, a) => s + a.total, 0);

  return { income, expenses, totalIncome, totalExpense, surplus: totalIncome - totalExpense };
}

/**
 * Fund balance report — the one the church council actually reads.
 * Opening balance + income − expenditure ± transfers = closing balance.
 */
export async function fundBalances(period: Period) {
  const funds = await db.fund.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });

  const [priorTx, periodTx, transfers] = await Promise.all([
    db.transaction.findMany({
      where: {
        ...notDeleted,
        date: { lt: period.start },
        type: { in: [TxType.RECEIPT, TxType.PAYMENT] },
      },
      select: { fundId: true, amount: true, type: true },
    }),
    db.transaction.findMany({
      where: {
        ...notDeleted,
        date: { gte: period.start, lte: period.end },
        type: { in: [TxType.RECEIPT, TxType.PAYMENT] },
      },
      select: { fundId: true, amount: true, type: true },
    }),
    db.fundTransfer.findMany({
      where: { date: { gte: period.start, lte: period.end } },
      select: { fromFundId: true, toFundId: true, amount: true },
    }),
  ]);

  const signed = (t: { amount: number; type: TxType }) =>
    t.type === TxType.RECEIPT ? t.amount : -t.amount;

  return funds.map((f) => {
    const prior = priorTx
      .filter((t) => t.fundId === f.id)
      .reduce((s, t) => s + signed(t), 0);

    const mine = periodTx.filter((t) => t.fundId === f.id);
    const income = mine.filter((t) => t.type === TxType.RECEIPT).reduce((s, t) => s + t.amount, 0);
    const expense = mine.filter((t) => t.type === TxType.PAYMENT).reduce((s, t) => s + t.amount, 0);

    const transferIn = transfers.filter((t) => t.toFundId === f.id).reduce((s, t) => s + t.amount, 0);
    const transferOut = transfers.filter((t) => t.fromFundId === f.id).reduce((s, t) => s + t.amount, 0);

    const opening = f.openingBalance + prior;
    const net = transferIn - transferOut;

    return {
      id: f.id,
      code: f.code,
      name: f.name,
      fundClass: f.fundClass,
      opening,
      income,
      expense,
      transfers: net,
      closing: opening + income - expense + net,
    };
  });
}

/** Accounts down, months across — exposes anomalies at a glance. */
export async function monthlyComparison(period: Period, type: AccountType) {
  const rows = await db.transaction.findMany({
    where: {
      ...notDeleted,
      date: { gte: period.start, lte: period.end },
      account: { type },
    },
    select: {
      amount: true,
      date: true,
      account: { select: { id: true, code: true, name: true } },
    },
  });

  const months = financialYearMonths(period.start);
  const byAccount = new Map<
    string,
    { code: string; name: string; months: Record<string, number>; total: number }
  >();

  for (const r of rows) {
    const k = r.account.id;
    const cur =
      byAccount.get(k) ?? { code: r.account.code, name: r.account.name, months: {}, total: 0 };
    const mk = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, "0")}`;
    cur.months[mk] = (cur.months[mk] ?? 0) + r.amount;
    cur.total += r.amount;
    byAccount.set(k, cur);
  }

  const accounts = [...byAccount.values()].sort((a, b) => a.code.localeCompare(b.code));
  const monthTotals = months.map((m) =>
    accounts.reduce((s, a) => s + (a.months[m.key] ?? 0), 0),
  );

  return {
    months,
    accounts,
    monthTotals,
    grandTotal: accounts.reduce((s, a) => s + a.total, 0),
  };
}

/** Month-by-month income vs expenditure, for the dashboard chart.
 *  Months after `upTo` are omitted so the line does not fall off a cliff
 *  into months that simply have not happened yet. */
export async function monthlyTrend(period: Period, upTo?: Date) {
  const rows = await db.transaction.findMany({
    where: {
      ...notDeleted,
      date: { gte: period.start, lte: period.end },
      type: { in: [TxType.RECEIPT, TxType.PAYMENT] },
    },
    select: { amount: true, type: true, date: true },
  });

  const cutoff = upTo ?? period.end;
  const months = financialYearMonths(period.start).filter(
    (m) => m.date <= new Date(cutoff.getFullYear(), cutoff.getMonth(), 1),
  );
  return months.map((m) => {
    const mine = rows.filter(
      (r) =>
        r.date.getFullYear() === m.date.getFullYear() &&
        r.date.getMonth() === m.date.getMonth(),
    );
    const income = mine.filter((r) => r.type === TxType.RECEIPT).reduce((s, r) => s + r.amount, 0);
    const expense = mine.filter((r) => r.type === TxType.PAYMENT).reduce((s, r) => s + r.amount, 0);
    return { month: m.label, key: m.key, income, expense, net: income - expense };
  });
}

/** Expense split by account, for the dashboard donut. */
export async function expenseBreakdown(period: Period, limit = 8) {
  const rows = await db.transaction.findMany({
    where: {
      ...notDeleted,
      date: { gte: period.start, lte: period.end },
      type: TxType.PAYMENT,
    },
    select: { amount: true, account: { select: { id: true, name: true } } },
  });

  const map = new Map<string, { name: string; value: number }>();
  for (const r of rows) {
    const cur = map.get(r.account.id) ?? { name: r.account.name, value: 0 };
    cur.value += r.amount;
    map.set(r.account.id, cur);
  }

  const sorted = [...map.values()].sort((a, b) => b.value - a.value);
  if (sorted.length <= limit) return sorted;
  const head = sorted.slice(0, limit);
  const tail = sorted.slice(limit).reduce((s, x) => s + x.value, 0);
  return [...head, { name: "Other", value: tail }];
}

/** Budget vs actual, per account, for a period. */
export async function budgetVsActual(period: Period) {
  const budget = await db.budget.findFirst({
    where: { isActive: true, yearStart: { lte: period.end }, yearEnd: { gte: period.start } },
    include: { lines: { include: { account: true, fund: true } } },
  });
  if (!budget) return null;

  const actuals = await db.transaction.groupBy({
    by: ["accountId"],
    where: {
      ...notDeleted,
      date: { gte: period.start, lte: period.end },
      type: { in: [TxType.RECEIPT, TxType.PAYMENT] },
    },
    _sum: { amount: true },
  });

  const actualMap = new Map(actuals.map((a) => [a.accountId, a._sum.amount ?? 0]));

  const lines = budget.lines
    .map((l) => {
      const actual = actualMap.get(l.accountId) ?? 0;
      const variance = l.account.type === AccountType.INCOME ? actual - l.amount : l.amount - actual;
      return {
        code: l.account.code,
        name: l.account.name,
        type: l.account.type,
        fund: l.fund?.name ?? "All funds",
        budget: l.amount,
        actual,
        variance,
        variancePct: l.amount ? (variance / l.amount) * 100 : 0,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));

  return { budget, lines };
}

/** Contribution totals per member for a period — donor statements, top givers. */
export async function contributionsByMember(period: Period) {
  const lines = await db.contributionLine.findMany({
    where: {
      batch: { status: "POSTED", serviceDate: { gte: period.start, lte: period.end } },
      memberId: { not: null },
    },
    select: {
      amount: true,
      member: { select: { id: true, fullName: true, memberNumber: true } },
    },
  });

  const map = new Map<string, { id: string; name: string; number: string; total: number; count: number }>();
  for (const l of lines) {
    if (!l.member) continue;
    const cur =
      map.get(l.member.id) ??
      { id: l.member.id, name: l.member.fullName, number: l.member.memberNumber, total: 0, count: 0 };
    cur.total += l.amount;
    cur.count += 1;
    map.set(l.member.id, cur);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/** Straight-line depreciation to a given date. */
export function depreciation(asset: {
  acquisitionCost: number;
  residualValue: number;
  usefulLifeYears: number;
  acquisitionDate: Date;
}, asAt = new Date()) {
  const depreciable = asset.acquisitionCost - asset.residualValue;
  if (depreciable <= 0 || asset.usefulLifeYears <= 0) {
    return { accumulated: 0, netBookValue: asset.acquisitionCost, annual: 0 };
  }
  const annual = depreciable / asset.usefulLifeYears;
  const years = Math.max(
    0,
    (asAt.getTime() - asset.acquisitionDate.getTime()) / (365.25 * 24 * 3600 * 1000),
  );
  const accumulated = Math.min(depreciable, annual * years);
  return {
    accumulated,
    netBookValue: asset.acquisitionCost - accumulated,
    annual,
  };
}
