import "server-only";
import { db } from "@/lib/db";

/**
 * The kinds of giving the treasurer records by name, and where each lands in
 * the books. Every one is an account and a fund, exactly as a counted batch
 * would book it — this is a faster way in, not a second ledger.
 */
export const GIVING_TYPES = [
  { key: "TITHE", label: "Tithe", account: "4010", fund: "GEN" },
  { key: "OFFERING", label: "Offering", account: "4020", fund: "GEN" },
  { key: "THANKSGIVING", label: "Thanksgiving", account: "4030", fund: "GEN" },
  { key: "BUILDING", label: "Building fund", account: "4040", fund: "BLD" },
  { key: "MISSIONS", label: "Missions", account: "4050", fund: "MIS" },
] as const;

export type GivingKey = (typeof GIVING_TYPES)[number]["key"];

export function monthOf(param: string | undefined, fallback: Date) {
  const m = param?.match(/^(\d{4})-(\d{2})$/);
  const year = m ? Number(m[1]) : fallback.getFullYear();
  const month = m ? Number(m[2]) - 1 : fallback.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const key = `${year}-${String(month + 1).padStart(2, "0")}`;
  const label = start.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const k = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return { start, end, key, label, prevKey: k(prev), nextKey: k(next) };
}

/** Every named or loose gift in a month, whatever batch it sits in. */
export async function givingForMonth(start: Date, end: Date) {
  const codes = GIVING_TYPES.map((g) => g.account);
  const lines = await db.contributionLine.findMany({
    where: {
      batch: { serviceDate: { gte: start, lte: end } },
      account: { code: { in: codes } },
    },
    include: {
      member: { select: { id: true, fullName: true, memberNumber: true } },
      account: { select: { code: true, name: true } },
      batch: { select: { id: true, serviceDate: true, status: true, batchNumber: true } },
    },
    orderBy: [{ batch: { serviceDate: "desc" } }, { createdAt: "desc" }],
  });

  const typeOf = (code: string) => GIVING_TYPES.find((g) => g.account === code)!;
  const totals = Object.fromEntries(GIVING_TYPES.map((g) => [g.key, 0])) as Record<GivingKey, number>;
  for (const l of lines) totals[typeOf(l.account.code).key] += l.amount;

  // Who tithed, and how much — the list the treasurer is asked for.
  const tithers = new Map<string, { id: string; name: string; number: string; count: number; total: number }>();
  let anonymousTithes = 0;
  for (const l of lines) {
    if (l.account.code !== "4010") continue;
    if (!l.member) { anonymousTithes += l.amount; continue; }
    const t = tithers.get(l.member.id) ?? { id: l.member.id, name: l.member.fullName, number: l.member.memberNumber, count: 0, total: 0 };
    t.count += 1;
    t.total += l.amount;
    tithers.set(l.member.id, t);
  }

  return {
    lines: lines.map((l) => ({ ...l, type: typeOf(l.account.code) })),
    totals,
    grandTotal: lines.reduce((s, l) => s + l.amount, 0),
    tithers: [...tithers.values()].sort((a, b) => b.total - a.total),
    anonymousTithes,
    unposted: lines.filter((l) => l.batch.status !== "POSTED").length,
  };
}
