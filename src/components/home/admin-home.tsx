/**
 * The administrator's home: the whole church at once.
 *
 * Every other office gets a screen built around its own work. This one is
 * deliberately the wide view, because the administrator is the person who
 * has to answer for any part of it.
 */
import Link from "next/link";
import {
  CalendarDays, Cake, Droplets, HandCoins, Package, Receipt,
  ScanLine, TrendingUp, Users, Wallet,
} from "lucide-react";
import { db } from "@/lib/db";
import { today } from "@/lib/demo";
import {
  expenseBreakdown, financialYearBounds, fundBalances,
  incomeExpenseTotals, monthlyTrend, monthBounds,
} from "@/lib/finance";
import { formatZAR, formatZARCompact, formatDate, firstName } from "@/lib/format";
import { KpiGrid, KpiTile } from "@/components/kpi";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { TrendChart, BreakdownChart } from "@/components/charts";

export async function AdminHome({ name }: { name: string }) {
    const now = today();
  const fy = financialYearBounds(now, 3);
  const thisMonth = monthBounds(now);
  const lastMonth = monthBounds(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const [
    memberCount, newMembers, monthTotals, prevTotals, fyTotals,
    funds, trend, breakdown, upcoming, birthdays, pendingBatches,
    assetAgg, dueVerification, baptismCandidates, attendance,
  ] = await Promise.all([
    db.member.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    db.member.count({ where: { deletedAt: null, registrationDate: { gte: fy.start } } }),
    incomeExpenseTotals(thisMonth),
    incomeExpenseTotals(lastMonth),
    incomeExpenseTotals({ start: fy.start, end: fy.end }),
    fundBalances({ start: fy.start, end: fy.end }),
    monthlyTrend({ start: fy.start, end: fy.end }, now),
    expenseBreakdown({ start: fy.start, end: fy.end }, 7),
    db.event.findMany({
      where: { deletedAt: null, startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 6,
    }),
    db.member.findMany({
      where: { deletedAt: null, status: "ACTIVE", dob: { not: null } },
      select: { id: true, fullName: true, dob: true },
    }),
    db.batch.count({ where: { status: { in: ["DRAFT", "COUNTED", "REVIEWED"] } } }),
    db.asset.aggregate({
      where: { deletedAt: null, status: { notIn: ["DISPOSED", "WRITTEN_OFF"] } },
      _sum: { acquisitionCost: true },
      _count: true,
    }),
    db.asset.count({
      where: {
        deletedAt: null,
        status: { notIn: ["DISPOSED", "WRITTEN_OFF"] },
        OR: [{ lastVerifiedAt: null }, { lastVerifiedAt: { lt: fy.start } }],
      },
    }),
    db.baptism.count({ where: { deletedAt: null, status: { in: ["CANDIDATE", "CLASS_IN_PROGRESS", "APPROVED"] } } }),
    db.attendanceRegister.findMany({ orderBy: { serviceDate: "desc" }, take: 8 }),
  ]);

  const totalFundBalance = funds.reduce((s, f) => s + f.closing, 0);
  const restricted = funds
    .filter((f) => f.fundClass !== "UNRESTRICTED")
    .reduce((s, f) => s + f.closing, 0);

  const delta = (cur: number, prev: number) =>
    prev === 0 ? null : ((cur - prev) / prev) * 100;

  // birthdays in the next 7 days
  const soon = birthdays
    .map((m) => {
      const d = m.dob!;
      const next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
      if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate()))
        next.setFullYear(now.getFullYear() + 1);
      return { ...m, next, days: Math.round((next.getTime() - now.getTime()) / 86400000) };
    })
    .filter((m) => m.days >= 0 && m.days <= 7)
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);

  const avgAttendance = attendance.length
    ? Math.round(attendance.reduce((s, a) => s + (a.headcount ?? 0), 0) / attendance.length)
    : 0;

  return (
    <div className="mx-auto max-w-[1400px] 2xl:max-w-[1760px]">
      <PageHeader
        title={`Good day, ${firstName(name)}`}
        description={`Financial year ${fy.label} · ${formatDate(fy.start)} to ${formatDate(fy.end)}`}
      />

      <KpiGrid>
        <KpiTile
          label="Active members"
          value={String(memberCount)}
          comparison={`${newMembers} joined this year`}
          icon={<Users size={15} />}
        />
        <KpiTile
          label="Income this month"
          value={formatZARCompact(monthTotals.income)}
          delta={delta(monthTotals.income, prevTotals.income)}
          comparison="vs last month"
          goodDirection="up"
          icon={<HandCoins size={15} />}
        />
        <KpiTile
          label="Expenditure this month"
          value={formatZARCompact(monthTotals.expense)}
          delta={delta(monthTotals.expense, prevTotals.expense)}
          comparison="vs last month"
          goodDirection="down"
          icon={<Receipt size={15} />}
        />
        <KpiTile
          label="Total fund balance"
          value={formatZARCompact(totalFundBalance)}
          comparison={`${formatZARCompact(restricted)} restricted`}
          icon={<Wallet size={15} />}
          accent
        />
        <KpiTile
          label="Surplus this year"
          value={formatZARCompact(fyTotals.net)}
          comparison={`on ${formatZARCompact(fyTotals.income)} income`}
          icon={<TrendingUp size={15} />}
        />
        <KpiTile
          label="Average attendance"
          value={String(avgAttendance)}
          comparison="last 8 services"
          icon={<Users size={15} />}
        />
      </KpiGrid>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Income and expenditure"
            subtitle={`Month by month, financial year ${fy.label}`}
          />
          <div className="p-4">
            <TrendChart data={trend} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Where the money goes" subtitle="Expenditure by category, year to date" />
          <div className="p-4">
            <BreakdownChart data={breakdown} />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {/* fund balances */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Fund balances"
            subtitle="Opening, movement and closing balance per fund"
            action={
              <Link href="/funds" className="text-[13px] font-medium text-bronze-600 hover:underline dark:text-bronze-300">
                View all
              </Link>
            }
          />
          <div className="w-full sm:overflow-x-auto">
            <table className="stacked-table w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b px-4 py-2.5 text-left text-[12px] font-semibold tracking-wide text-[var(--text-muted)] uppercase">Fund</th>
                  <th className="border-b px-4 py-2.5 text-right text-[12px] font-semibold tracking-wide text-[var(--text-muted)] uppercase">Opening</th>
                  <th className="border-b px-4 py-2.5 text-right text-[12px] font-semibold tracking-wide text-[var(--text-muted)] uppercase">Income</th>
                  <th className="border-b px-4 py-2.5 text-right text-[12px] font-semibold tracking-wide text-[var(--text-muted)] uppercase">Spent</th>
                  <th className="border-b px-4 py-2.5 text-right text-[12px] font-semibold tracking-wide text-[var(--text-muted)] uppercase">Closing</th>
                </tr>
              </thead>
              <tbody>
                {funds.map((f) => (
                  <tr key={f.id} className="hover:bg-sand-50 dark:hover:bg-sand-800/40">
                    <td data-label="Fund" className="border-b px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{f.name}</span>
                        {f.fundClass !== "UNRESTRICTED" ? (
                          <Badge tone="warning">Restricted</Badge>
                        ) : null}
                      </div>
                    </td>
                    <td data-label="Opening" className="tnum border-b px-4 py-2.5 text-right text-[var(--text-muted)]">{formatZAR(f.opening, { decimals: false })}</td>
                    <td data-label="Income" className="tnum border-b px-4 py-2.5 text-right text-success">{formatZAR(f.income, { decimals: false })}</td>
                    <td data-label="Spent" className="tnum border-b px-4 py-2.5 text-right text-danger">{formatZAR(f.expense, { decimals: false })}</td>
                    <td data-label="Closing" className="tnum border-b px-4 py-2.5 text-right font-semibold">{formatZAR(f.closing, { decimals: false })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-sand-50 font-semibold dark:bg-sand-800/40">
                  <td className="px-4 py-2.5">Total</td>
                  <td data-label="Opening" className="tnum px-4 py-2.5 text-right">{formatZAR(funds.reduce((s, f) => s + f.opening, 0), { decimals: false })}</td>
                  <td data-label="Income" className="tnum px-4 py-2.5 text-right">{formatZAR(funds.reduce((s, f) => s + f.income, 0), { decimals: false })}</td>
                  <td data-label="Spent" className="tnum px-4 py-2.5 text-right">{formatZAR(funds.reduce((s, f) => s + f.expense, 0), { decimals: false })}</td>
                  <td data-label="Closing" className="tnum px-4 py-2.5 text-right">{formatZAR(totalFundBalance, { decimals: false })}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* needs attention + upcoming */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Needs attention" />
            <ul className="divide-y">
              {pendingBatches > 0 ? (
                <AttentionRow
                  href="/contributions"
                  icon={<HandCoins size={15} />}
                  label={`${pendingBatches} offering ${pendingBatches === 1 ? "batch" : "batches"} not yet posted`}
                  tone="warning"
                />
              ) : null}
              {dueVerification > 0 ? (
                <AttentionRow
                  href="/stocktake"
                  icon={<ScanLine size={15} />}
                  label={`${dueVerification} assets due for verification`}
                  tone="warning"
                />
              ) : null}
              {baptismCandidates > 0 ? (
                <AttentionRow
                  href="/baptisms"
                  icon={<Droplets size={15} />}
                  label={`${baptismCandidates} baptism candidates in progress`}
                  tone="info"
                />
              ) : null}
              <AttentionRow
                href="/assets"
                icon={<Package size={15} />}
                label={`${assetAgg._count} assets · ${formatZARCompact(assetAgg._sum.acquisitionCost ?? 0)} at cost`}
                tone="neutral"
              />
            </ul>
          </Card>

          <Card>
            <CardHeader
              title="Coming up"
              action={
                <Link href="/planner" className="text-[13px] font-medium text-bronze-600 hover:underline dark:text-bronze-300">
                  Planner
                </Link>
              }
            />
            {upcoming.length === 0 ? (
              <EmptyState icon={<CalendarDays size={18} />} title="Nothing scheduled" />
            ) : (
              <ul className="divide-y">
                {upcoming.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg border bg-sand-50 dark:bg-sand-800">
                      <span className="text-[9px] leading-none text-[var(--text-muted)] uppercase">
                        {new Intl.DateTimeFormat("en-ZA", { month: "short" }).format(e.startsAt)}
                      </span>
                      <span className="tnum text-[13px] leading-tight font-semibold">
                        {e.startsAt.getDate()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium">{e.title}</p>
                      <p className="truncate text-[12px] text-[var(--text-muted)]">
                        {new Intl.DateTimeFormat("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false }).format(e.startsAt)}
                        {e.location ? ` · ${e.location}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {soon.length > 0 ? (
            <Card>
              <CardHeader title="Birthdays this week" />
              <ul className="divide-y">
                {soon.map((m) => (
                  <li key={m.id} className="flex items-center gap-2.5 px-4 py-2.5">
                    <Cake size={15} className="text-bronze-500" />
                    <Link href={`/members/${m.id}`} className="flex-1 truncate text-[13.5px] hover:underline">
                      {m.fullName}
                    </Link>
                    <span className="text-[12px] text-[var(--text-muted)]">
                      {m.days === 0 ? "Today" : m.days === 1 ? "Tomorrow" : formatDate(m.next)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AttentionRow({
  href, icon, label, tone,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  tone: "warning" | "info" | "neutral";
}) {
  const colors = {
    warning: "text-warning",
    info: "text-info",
    neutral: "text-[var(--text-muted)]",
  };
  return (
    <li>
      <Link href={href} className="flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] hover:bg-sand-50 dark:hover:bg-sand-800/40">
        <span className={colors[tone]}>{icon}</span>
        <span className="flex-1">{label}</span>
      </Link>
    </li>
  );
}
