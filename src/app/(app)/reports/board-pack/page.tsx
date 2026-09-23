import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { today } from "@/lib/demo";
import { requireArea } from "@/lib/guards";
import {
  budgetVsActual, departmentBudgets, expenseBreakdown, financialYearBounds,
  fundBalances, incomeExpenseTotals, monthlyTrend,
} from "@/lib/finance";
import { enumLabel, formatDate, formatZAR, formatZARCompact } from "@/lib/format";
import { givingForMonth } from "@/lib/giving";
import { PrintBar, PrintSheet } from "@/components/print-sheet";
import { BreakdownChart, BudgetBars, TrendChart } from "@/components/charts";

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border border-neutral-300 px-3 py-2.5">
      <p className="text-[9.5px] tracking-wide text-neutral-500 uppercase">{label}</p>
      <p className="tnum mt-0.5 text-[18px] font-semibold">{value}</p>
      {note ? <p className="text-[10px] text-neutral-600">{note}</p> : null}
    </div>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 mb-2 border-b-2 border-black pb-1 text-[13px] font-semibold">{children}</h2>;
}

/**
 * The board pack.
 *
 * One document the treasurer can put in front of the board without building
 * it by hand: where the church stands, where the money came from and went,
 * how each fund and each department is doing, and what the church owns. It
 * reads on screen and prints to A4 with its graphs intact.
 */
export default async function BoardPack() {
  await requireArea("tithes");
  const session = await getSession();
  const now = today();
  const settings = await db.settings.findFirst();
  const fy = financialYearBounds(now, settings?.financialYearStartMonth ?? 3);
  const period = { start: fy.start, end: fy.end };

  const [totals, trend, breakdown, funds, departments, church, giving, assetsByStatus, outreach, welfare] =
    await Promise.all([
      incomeExpenseTotals(period),
      monthlyTrend(period, now),
      expenseBreakdown(period, 8),
      fundBalances(period),
      departmentBudgets(period),
      budgetVsActual(period),
      givingForMonth(fy.start, fy.end),
      db.asset.groupBy({
        by: ["status"],
        where: { deletedAt: null },
        _count: true,
        _sum: { acquisitionCost: true },
      }),
      db.outreach.aggregate({
        where: { deletedAt: null, status: "DONE", startsAt: { gte: fy.start, lte: fy.end } },
        _count: true,
        _sum: { peopleReached: true, decisions: true },
      }),
      db.welfareGrant.aggregate({
        where: { deletedAt: null, status: "GIVEN", date: { gte: fy.start, lte: fy.end } },
        _count: true,
        _sum: { estimatedValue: true },
      }),
    ]);

  const totalFunds = funds.reduce((s, f) => s + f.closing, 0);
  const restricted = funds.filter((f) => f.fundClass !== "UNRESTRICTED").reduce((s, f) => s + f.closing, 0);
  const assetValue = assetsByStatus
    .filter((a) => a.status !== "DISPOSED" && a.status !== "WRITTEN_OFF")
    .reduce((s, a) => s + (a._sum.acquisitionCost ?? 0), 0);
  const worst = church
    ? [...church.lines].sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)).slice(0, 8)
    : [];

  return (
    <>
      <PrintBar backHref="/reports" label="Print the board pack" />
      <PrintSheet
        title="Board pack"
        period={`Financial year ${fy.label} · to ${formatDate(now)}`}
        subtitle="Prepared by the treasurer"
        generatedBy={session?.name}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Figure label="Income" value={formatZARCompact(totals.income)} note="this year to date" />
          <Figure label="Expenditure" value={formatZARCompact(totals.expense)} note="this year to date" />
          <Figure label={totals.net >= 0 ? "Surplus" : "Shortfall"} value={formatZARCompact(Math.abs(totals.net))} />
          <Figure label="Held in funds" value={formatZARCompact(totalFunds)} note={`${formatZARCompact(restricted)} restricted`} />
        </div>

        <H>Income and expenditure, month by month</H>
        <div className="avoid-break"><TrendChart data={trend} /></div>

        <H>Where the money went</H>
        <div className="avoid-break"><BreakdownChart data={breakdown} /></div>

        <H>Giving</H>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Figure label="Tithes" value={formatZARCompact(giving.totals.TITHE)} />
          <Figure label="Members who tithed" value={String(giving.tithers.length)} />
          <Figure label="Offerings" value={formatZARCompact(giving.grandTotal - giving.totals.TITHE)} />
          <Figure label="All giving" value={formatZARCompact(giving.grandTotal)} />
        </div>

        <H>Funds</H>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-black text-left text-[10.5px] text-neutral-600 uppercase">
              <th className="py-1.5">Fund</th><th className="py-1.5 text-right">Opening</th>
              <th className="py-1.5 text-right">In</th><th className="py-1.5 text-right">Out</th>
              <th className="py-1.5 text-right">Closing</th>
            </tr>
          </thead>
          <tbody>
            {funds.map((f) => (
              <tr key={f.id} className="border-b border-neutral-200">
                <td className="py-1.5">{f.name}<span className="text-neutral-500"> · {enumLabel(f.fundClass)}</span></td>
                <td className="tnum py-1.5 text-right">{formatZAR(f.opening, { decimals: false })}</td>
                <td className="tnum py-1.5 text-right">{formatZAR(f.income, { decimals: false })}</td>
                <td className="tnum py-1.5 text-right">{formatZAR(f.expense, { decimals: false })}</td>
                <td className="tnum py-1.5 text-right font-semibold">{formatZAR(f.closing, { decimals: false })}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <H>Departments against their budgets</H>
        <div className="avoid-break">
          <BudgetBars data={departments.filter((d) => d.hasBudget || d.spent > 0).map((d) => ({ name: d.name, budget: d.budget, actual: d.spent }))} />
        </div>
        <table className="mt-2 w-full border-collapse">
          <thead>
            <tr className="border-b border-black text-left text-[10.5px] text-neutral-600 uppercase">
              <th className="py-1.5">Department</th><th className="py-1.5 text-right">Budget</th>
              <th className="py-1.5 text-right">Spent</th><th className="py-1.5 text-right">Left</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d.id} className="border-b border-neutral-200">
                <td className="py-1.5">{d.name}</td>
                <td className="tnum py-1.5 text-right">{d.hasBudget ? formatZAR(d.budget, { decimals: false }) : "—"}</td>
                <td className="tnum py-1.5 text-right">{formatZAR(d.spent, { decimals: false })}</td>
                <td className={`tnum py-1.5 text-right ${d.hasBudget && d.remaining < 0 ? "font-semibold" : ""}`}>
                  {d.hasBudget ? formatZAR(d.remaining, { decimals: false, parens: true }) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {church ? (
          <>
            <H>Furthest from the church budget</H>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-black text-left text-[10.5px] text-neutral-600 uppercase">
                  <th className="py-1.5">Account</th><th className="py-1.5 text-right">Budget</th>
                  <th className="py-1.5 text-right">Actual</th><th className="py-1.5 text-right">Difference</th>
                </tr>
              </thead>
              <tbody>
                {worst.map((l) => (
                  <tr key={`${l.code}-${l.fund}`} className="border-b border-neutral-200">
                    <td className="py-1.5">{l.code} {l.name}</td>
                    <td className="tnum py-1.5 text-right">{formatZAR(l.budget, { decimals: false })}</td>
                    <td className="tnum py-1.5 text-right">{formatZAR(l.actual, { decimals: false })}</td>
                    <td className="tnum py-1.5 text-right">
                      {l.type === "INCOME" ? (l.variance < 0 ? "short " : "ahead ") : l.variance < 0 ? "over " : "under "}
                      {formatZAR(Math.abs(l.variance), { decimals: false })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}

        <H>What the church owns</H>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Figure label="Asset value" value={formatZARCompact(assetValue)} note="at cost, in use" />
          {assetsByStatus.map((a) => (
            <Figure key={a.status} label={enumLabel(a.status)} value={String(a._count)} note={formatZARCompact(a._sum.acquisitionCost ?? 0)} />
          ))}
        </div>

        <H>The ministries this year</H>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Figure label="Outreaches" value={String(outreach._count)} note={`${outreach._sum.peopleReached ?? 0} reached`} />
          <Figure label="Decisions" value={String(outreach._sum.decisions ?? 0)} note="at outreaches" />
          <Figure label="Welfare given" value={String(welfare._count)} note="times help was given" />
          <Figure label="Welfare value" value={formatZARCompact(welfare._sum.estimatedValue ?? 0)} />
        </div>
      </PrintSheet>
    </>
  );
}
