import { db } from "@/lib/db";
import { today } from "@/lib/demo";
import {
  budgetVsActual, financialYearBounds, fundBalances,
  incomeExpenseTotals, monthBounds, monthlyTrend,
} from "@/lib/finance";
import { formatZAR, formatZARCompact, formatDate, enumLabel, firstName } from "@/lib/format";
import { KpiGrid, KpiTile } from "@/components/kpi";
import Link from "next/link";
import { Button, Card, CardHeader, PageHeader } from "@/components/ui";
import { TrendChart } from "@/components/charts";
import { Panel, Row } from "@/components/home/kit";
import { givingForMonth } from "@/lib/giving";
import { HandCoins, Presentation, Receipt, ScanLine, Wallet } from "lucide-react";

/**
 * The treasurer's desk.
 *
 * Ordered by what stops the books closing: offerings counted but not posted,
 * then the budget position, then the funds. The money already banked is not
 * the urgent part — the batch sitting in "counted" is.
 */
export async function TreasurerHome({ name }: { name: string }) {
  const now = today();
  const fy = financialYearBounds(now, 3);
  const thisMonth = monthBounds(now);
  const lastMonth = monthBounds(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const [monthTotals, prevTotals, funds, trend, openBatches, budget, assetsByStatus, recentExpenses, awaiting, giving] =
    await Promise.all([
      incomeExpenseTotals(thisMonth),
      incomeExpenseTotals(lastMonth),
      fundBalances({ start: fy.start, end: fy.end }),
      monthlyTrend({ start: fy.start, end: fy.end }, now),
      db.batch.findMany({
        where: { status: { in: ["DRAFT", "COUNTED", "REVIEWED"] } },
        orderBy: { serviceDate: "asc" },
        take: 8,
      }),
      budgetVsActual({ start: fy.start, end: fy.end }),
      db.asset.groupBy({
        by: ["status"],
        where: { deletedAt: null },
        _count: true,
        _sum: { acquisitionCost: true },
      }),
      db.transaction.findMany({
        where: { deletedAt: null, type: "PAYMENT" },
        orderBy: { date: "desc" },
        include: { account: true, fund: true },
        take: 6,
      }),
      db.budget.findMany({
        where: { status: "DRAFT", submittedAt: { not: null } },
        orderBy: { submittedAt: "asc" },
        include: { department: { select: { name: true } } },
      }),
      givingForMonth(thisMonth.start, thisMonth.end),
    ]);

  const assetValue = assetsByStatus
    .filter((a) => a.status !== "DISPOSED" && a.status !== "WRITTEN_OFF")
    .reduce((s, a) => s + (a._sum.acquisitionCost ?? 0), 0);

  const delta = (cur: number, prev: number) => (prev === 0 ? null : ((cur - prev) / prev) * 100);
  const totalFunds = funds.reduce((s, f) => s + f.closing, 0);
  const restricted = funds.filter((f) => f.fundClass !== "UNRESTRICTED").reduce((s, f) => s + f.closing, 0);

  // The lines furthest from budget, whichever direction they went.
  const worst = budget
    ? [...budget.lines].sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)).slice(0, 6)
    : [];

  return (
    <div className="mx-auto max-w-[1200px] 2xl:max-w-[1500px]">
      <PageHeader
        title={`Good day, ${firstName(name)}`}
        description={`Treasury — financial year ${fy.label}, ${formatDate(fy.start)} to ${formatDate(fy.end)}`}
        actions={
          <Link href="/reports/board-pack">
            <Button variant="primary"><Presentation size={15} /> Board pack</Button>
          </Link>
        }
      />

      <KpiGrid>
        <KpiTile label="Received this month" value={formatZARCompact(monthTotals.income)} delta={delta(monthTotals.income, prevTotals.income)} comparison="vs last month" goodDirection="up" icon={<HandCoins size={15} />} />
        <KpiTile label="Spent this month" value={formatZARCompact(monthTotals.expense)} delta={delta(monthTotals.expense, prevTotals.expense)} comparison="vs last month" goodDirection="down" icon={<Receipt size={15} />} />
        <KpiTile label="Fund balances" value={formatZARCompact(totalFunds)} comparison={`${formatZARCompact(restricted)} restricted`} icon={<Wallet size={15} />} accent />
        <KpiTile label="Not yet posted" value={String(openBatches.length)} comparison="offerings awaiting you" icon={<ScanLine size={15} />} />
      </KpiGrid>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <Panel
          title="Budgets to approve"
          subtitle="Sent in by the departments"
          href="/budgets"
          empty="Nothing waiting for you."
        >
          {awaiting.map((b) => (
            <Row
              key={b.id}
              href={`/budgets/${b.id}`}
              title={b.name}
              meta={`${b.department?.name ?? "Whole church"} · sent by ${b.submittedBy}`}
              tone="warning"
            />
          ))}
        </Panel>

        <Panel
          title={`Tithes this month · ${formatZAR(giving.totals.TITHE)}`}
          subtitle={`${giving.tithers.length} members tithed · ${formatZAR(giving.grandTotal)} received in all`}
          href="/tithes"
          hrefLabel="Record giving"
          empty="Nothing recorded yet this month."
        >
          {giving.tithers.slice(0, 5).map((t) => (
            <Row key={t.id} title={t.name} meta={t.number} right={formatZAR(t.total)} />
          ))}
        </Panel>

        <Panel
          title="Offerings to finish"
          subtitle="Counted or reviewed, not yet in the ledger"
          href="/contributions"
          empty="Every offering has been posted."
        >
          {openBatches.map((b) => (
            <Row
              key={b.id}
              href={`/contributions/${b.id}`}
              title={formatDate(b.serviceDate)}
              meta={`${enumLabel(b.status)}${b.expectedTotal ? ` · declared ${formatZAR(b.expectedTotal)}` : ""}`}
              tone={b.status === "DRAFT" ? "warning" : undefined}
            />
          ))}
        </Panel>

        <Card className="lg:col-span-2">
          <CardHeader title="Income and expenditure" subtitle={`Month by month, ${fy.label}`} />
          <div className="p-4">
            <TrendChart data={trend} />
          </div>
        </Card>

        <Panel
          title="Furthest from budget"
          subtitle={budget ? budget.budget.name : undefined}
          href="/reports/budget-vs-actual"
          empty="No approved budget for this year yet."
        >
          {worst.map((l) => (
            <Row
              key={`${l.code}-${l.fund}`}
              title={`${l.code} ${l.name}`}
              meta={l.fund}
              right={
                // The report makes a positive variance "good" for both kinds,
                // so the word has to follow the account type: an income line
                // that is short is not "over budget".
                <span className={l.variance < 0 ? "text-danger" : ""}>
                  {l.type === "INCOME"
                    ? l.variance < 0 ? "short by " : "ahead by "
                    : l.variance < 0 ? "over by " : "under by "}
                  {formatZAR(Math.abs(l.variance))}
                </span>
              }
            />
          ))}
        </Panel>

        <Panel title="Fund balances" href="/funds" empty="No funds set up.">
          {funds.map((f) => (
            <Row
              key={f.id}
              title={f.name}
              meta={enumLabel(f.fundClass)}
              right={formatZAR(f.closing)}
              tone={f.closing < 0 ? "danger" : undefined}
            />
          ))}
        </Panel>

        <Panel title="Recent payments" href="/expenses" empty="Nothing paid out yet.">
          {recentExpenses.map((t) => (
            <Row
              key={t.id}
              title={t.description ?? t.account.name}
              meta={`${t.account.code} · ${t.fund?.name ?? ""}`}
              right={formatZAR(t.amount)}
            />
          ))}
        </Panel>
      </div>

      {/* Assets as the treasury needs them: what they are worth and what state
          they are in. Keeping the register is the office's job. */}
      <Card className="mt-4">
        <CardHeader title="What the church owns" subtitle={`${formatZAR(assetValue)} at cost, in use`} />
        <div className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
          {assetsByStatus.map((a) => (
            <div key={a.status} className="px-5 py-3">
              <p className="text-[11.5px] tracking-wide text-[var(--text-muted)] uppercase">{enumLabel(a.status)}</p>
              <p className="mt-0.5 text-[18px] font-semibold tabular-nums">{a._count}</p>
              <p className="text-[12px] text-[var(--text-muted)]">{formatZARCompact(a._sum.acquisitionCost ?? 0)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
