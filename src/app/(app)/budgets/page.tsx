import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, Sparkles, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { departmentBudgets, financialYearBounds } from "@/lib/finance";
import { formatZAR, formatDate } from "@/lib/format";
import { draftNextYearBudget } from "@/lib/actions/budgets";
import {
  Badge, Button, Card, CardHeader, EmptyState, Field, PageHeader, Select,
} from "@/components/ui";

export default async function BudgetsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session.role, "budgets")) redirect("/");
  const writable = can(session.role, "budgets", true);
  const approver = can(session.role, "budgets:approve", true);

  const settings = await db.settings.findFirst();
  const fyStartMonth = settings?.financialYearStartMonth ?? 3;
  const thisYear = financialYearBounds(new Date(), fyStartMonth);
  const nextYear = financialYearBounds(
    new Date(thisYear.start.getFullYear() + 1, thisYear.start.getMonth(), 1),
    fyStartMonth,
  );

  const [budgets, departments, standing] = await Promise.all([
    db.budget.findMany({
      orderBy: [{ yearStart: "desc" }, { name: "asc" }],
      include: {
        department: { select: { name: true } },
        lines: { select: { amount: true, account: { select: { type: true } } } },
      },
    }),
    db.department.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    departmentBudgets({ start: thisYear.start, end: thisYear.end }),
  ]);

  const awaiting = budgets.filter((b) => b.status === "DRAFT" && b.submittedAt);
  const totals = (b: (typeof budgets)[number]) => ({
    income: b.lines.filter((l) => l.account.type === "INCOME").reduce((s, l) => s + l.amount, 0),
    expense: b.lines.filter((l) => l.account.type === "EXPENSE").reduce((s, l) => s + l.amount, 0),
  });

  return (
    <div className="mx-auto max-w-[1000px] 2xl:max-w-[1240px]">
      <PageHeader
        title="Budgets"
        description="Every department plans its year; the treasurer approves it; the year is measured against it."
      />

      {approver && awaiting.length > 0 ? (
        <Card className="mb-4 border-bronze-300">
          <CardHeader
            title={`Waiting for your approval · ${awaiting.length}`}
            subtitle="Sent in by the departments"
          />
          <div className="divide-y">
            {awaiting.map((b) => (
              <Link
                key={b.id}
                href={`/budgets/${b.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-sand-100/60 dark:hover:bg-sand-800/40"
              >
                <div>
                  <p className="text-[14px] font-medium">{b.name}</p>
                  <p className="text-[12.5px] text-[var(--text-muted)]">
                    <Clock size={11} className="mr-1 inline" />
                    sent {b.submittedAt ? formatDate(b.submittedAt) : ""} by {b.submittedBy}
                  </p>
                </div>
                <span className="tnum text-[13.5px]">{formatZAR(totals(b).expense)}</span>
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="mb-4">
        <CardHeader
          title={`Departments this year · ${thisYear.label}`}
          subtitle="Approved budget against what each department has spent"
        />
        <div className="divide-y">
          {standing.map((d) => (
            <div key={d.id} className="px-5 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[14px] font-medium">
                  {d.name}
                  {d.leader ? <span className="font-normal text-[var(--text-muted)]"> · {d.leader}</span> : null}
                </p>
                <p className="tnum text-[13px]">
                  {d.hasBudget ? (
                    <>
                      {formatZAR(d.spent)} <span className="text-[var(--text-muted)]">of</span> {formatZAR(d.budget)}
                    </>
                  ) : (
                    <span className="text-[var(--text-muted)]">no approved budget · spent {formatZAR(d.spent)}</span>
                  )}
                </p>
              </div>
              {d.hasBudget && d.budget > 0 ? (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand-100 dark:bg-sand-800">
                  <div
                    className={`h-full rounded-full ${
                      (d.usedPct ?? 0) > 100 ? "bg-danger" : (d.usedPct ?? 0) > 85 ? "bg-warning" : "bg-bronze-500"
                    }`}
                    style={{ width: `${Math.min(100, d.usedPct ?? 0)}%` }}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      {writable ? (
        <Card className="mb-4">
          <CardHeader
            title={`Plan ${nextYear.label}`}
            subtitle={`Drawn from what was actually spent in ${thisYear.label}, or started empty if there is nothing yet`}
          />
          <form action={draftNextYearBudget} className="grid grid-cols-1 items-end gap-4 p-5 sm:grid-cols-[1fr_auto_auto_auto]">
            <Field label="For">
              <Select name="departmentId" defaultValue="">
                {approver ? <option value="">The whole church</option> : null}
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Add for rising costs">
              <Select name="uplift" defaultValue="6">
                <option value="0">No change</option>
                <option value="3">3%</option>
                <option value="5">5%</option>
                <option value="6">6%</option>
                <option value="8">8%</option>
                <option value="10">10%</option>
              </Select>
            </Field>
            <Field label="Round to">
              <Select name="roundTo" defaultValue="100">
                <option value="1">R 1</option>
                <option value="50">R 50</option>
                <option value="100">R 100</option>
                <option value="500">R 500</option>
              </Select>
            </Field>
            <Button type="submit" variant="primary">
              <Sparkles size={15} /> Start the draft
            </Button>
          </form>
        </Card>
      ) : null}

      {budgets.length === 0 ? (
        <Card>
          <EmptyState icon={<Wallet size={20} />} title="No budgets yet" description="Start one above." />
        </Card>
      ) : (
        <Card>
          <CardHeader title="All budgets" />
          <div className="divide-y">
            {budgets.map((b) => {
              const t = totals(b);
              return (
                <Link
                  key={b.id}
                  href={`/budgets/${b.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-sand-100/60 dark:hover:bg-sand-800/40"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium">
                      {b.name}
                      {b.status === "APPROVED" ? (
                        <Badge tone="success">Approved</Badge>
                      ) : b.submittedAt ? (
                        <Badge tone="warning">Awaiting approval</Badge>
                      ) : (
                        <Badge>Draft</Badge>
                      )}
                    </p>
                    <p className="text-[12.5px] text-[var(--text-muted)]">
                      {b.department?.name ?? "Whole church"} · {b.lines.length} lines
                      {b.approvedAt ? ` · approved ${formatDate(b.approvedAt)}` : ""}
                    </p>
                  </div>
                  <div className="text-right text-[13px]">
                    {t.income ? <p className="tnum">{formatZAR(t.income)} in</p> : null}
                    <p className="tnum text-[var(--text-muted)]">{formatZAR(t.expense)} out</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
