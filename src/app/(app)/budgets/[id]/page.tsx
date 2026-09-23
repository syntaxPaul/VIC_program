import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Check, Plus, Save, Send, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { financialYearBounds } from "@/lib/finance";
import { formatZAR, formatDate } from "@/lib/format";
import {
  addBudgetLine, approveBudget, deleteBudget, removeBudgetLine, saveBudgetLines,
  submitBudgetForApproval,
} from "@/lib/actions/budgets";
import {
  Badge, Button, Card, CardHeader, Field, Input, PageHeader, Select, Textarea,
} from "@/components/ui";
import { TxType, AccountType } from "@/generated/prisma";

export default async function BudgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session.role, "budgets")) redirect("/");
  const writable = can(session.role, "budgets", true);
  const approver = can(session.role, "budgets:approve", true);

  const { id } = await params;
  const budget = await db.budget.findFirst({
    where: { id },
    include: {
      lines: { include: { account: true, fund: true } },
      department: true,
    },
  });
  if (!budget) notFound();

  const draft = budget.status === "DRAFT";

  // What the same accounts actually did in the year the draft was built from,
  // so the treasurer can see the basis beside every figure they are changing.
  const basis = budget.basedOnYearStart
    ? financialYearBounds(budget.basedOnYearStart, budget.basedOnYearStart.getMonth() + 1)
    : null;

  // Grouped by account AND fund, because a budget line is per fund: designated
  // donations to the feeding scheme and to benevolence share account 4060, and
  // keying on the account alone showed the combined figure against both lines.
  const actuals = basis
    ? await db.transaction.groupBy({
        by: ["accountId", "fundId"],
        where: {
          deletedAt: null,
          date: { gte: basis.start, lte: basis.end },
          // A department is measured on what it spent; the church on everything.
          ...(budget.departmentId
            ? { type: TxType.PAYMENT, departmentId: budget.departmentId }
            : { type: { in: [TxType.RECEIPT, TxType.PAYMENT] } }),
        },
        _sum: { amount: true },
      })
    : [];
  const actualKey = (accountId: string, fundId: string | null) => `${accountId}:${fundId ?? ""}`;
  const actualBy = new Map(
    actuals.map((a) => [actualKey(a.accountId, a.fundId), a._sum.amount ?? 0]),
  );
  /** A line with no fund is budgeted across all of them, so sum every fund. */
  const actualFor = (accountId: string, fundId: string | null) => {
    if (fundId) return actualBy.get(actualKey(accountId, fundId)) ?? 0;
    return actuals
      .filter((a) => a.accountId === accountId)
      .reduce((sum, a) => sum + (a._sum.amount ?? 0), 0);
  };

  const income = budget.lines.filter((l) => l.account.type === AccountType.INCOME);
  const expense = budget.lines.filter((l) => l.account.type === AccountType.EXPENSE);
  const sum = (ls: typeof budget.lines) => ls.reduce((s, l) => s + l.amount, 0);
  const surplus = sum(income) - sum(expense);

  const accounts = await db.account.findMany({
    where: { type: { in: [AccountType.INCOME, AccountType.EXPENSE] }, isActive: true },
    orderBy: { code: "asc" },
  });
  const funds = await db.fund.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });

  const group = (title: string, ls: typeof budget.lines) => (
    <>
      <tr>
        <th colSpan={4} className="bg-sand-100/70 px-4 py-2 text-left text-[12px] font-semibold tracking-wide uppercase dark:bg-sand-800/50">
          {title}
        </th>
      </tr>
      {ls
        .sort((a, b) => a.account.code.localeCompare(b.account.code))
        .map((l) => (
          <tr key={l.id} className="border-b last:border-0">
            <td className="px-4 py-2 text-[13.5px]">
              <span className="tnum text-[var(--text-muted)]">{l.account.code}</span>{" "}
              {l.account.name}
              {l.fund ? <span className="text-[var(--text-muted)]"> · {l.fund.name}</span> : null}
            </td>
            <td data-label={basis ? `Actual ${basis.label}` : "Actual"} className="tnum px-4 py-2 text-right text-[13px] text-[var(--text-muted)]">
              {basis ? formatZAR(actualFor(l.accountId, l.fundId)) : "—"}
            </td>
            <td data-label="Budget" className="px-4 py-2 text-right">
              {draft && writable ? (
                <Input
                  name={`amount_${l.id}`}
                  defaultValue={String(l.amount)}
                  inputMode="decimal"
                  className="tnum h-8 w-32 text-right"
                />
              ) : (
                <span className="tnum text-[13.5px]">{formatZAR(l.amount)}</span>
              )}
            </td>
            <td className="px-2 py-2 text-right">
              {draft && writable ? (
                <Button
                  type="submit"
                  variant="ghost"
                  className="text-danger"
                  formAction={async () => {
                    "use server";
                    await removeBudgetLine(budget.id, l.id);
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              ) : null}
            </td>
          </tr>
        ))}
      <tr className="border-b-2">
        <td className="px-4 py-2 text-[13px] font-semibold">Total {title.toLowerCase()}</td>
        <td data-label="Actual" className="tnum px-4 py-2 text-right text-[13px] text-[var(--text-muted)]">
          {basis ? formatZAR(ls.reduce((s, l) => s + actualFor(l.accountId, l.fundId), 0)) : "—"}
        </td>
        <td data-label="Budget" className="tnum px-4 py-2 text-right text-[13.5px] font-semibold">{formatZAR(sum(ls))}</td>
        <td />
      </tr>
    </>
  );

  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeader
        title={budget.name}
        description={`${budget.department?.name ?? "Whole church"} · ${formatDate(budget.yearStart)} to ${formatDate(budget.yearEnd)}`}
        actions={
          !draft ? (
            <Badge tone="success">Approved</Badge>
          ) : budget.submittedAt ? (
            <Badge tone="warning">Awaiting approval</Badge>
          ) : (
            <Badge>Draft</Badge>
          )
        }
      />

      {budget.basedOnYearStart ? (
        <p className="mb-4 text-[13px] text-[var(--text-muted)]">
          Drafted from what was actually received and spent in{" "}
          {financialYearBounds(budget.basedOnYearStart, budget.basedOnYearStart.getMonth() + 1).label}
          {budget.upliftPercent ? `, with ${budget.upliftPercent}% added for rising costs` : ", unchanged"}.
          The middle column is that year&rsquo;s actual figure.
        </p>
      ) : null}

      <form>
        <Card className="mb-4 overflow-hidden">
          <table className="stacked-table w-full">
            <thead>
              <tr className="border-b text-[12px] text-[var(--text-muted)]">
                <th className="px-4 py-2 text-left font-medium">Account</th>
                <th className="px-4 py-2 text-right font-medium">
                  {basis ? `Actual ${basis.label}` : "Actual"}
                </th>
                <th className="px-4 py-2 text-right font-medium">Budget</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {income.length ? group("Income", income) : null}
              {expense.length ? group("Expenditure", expense) : null}
              <tr>
                <td className="px-4 py-3 text-[13.5px] font-semibold">
                  {surplus >= 0 ? "Surplus" : "Shortfall"}
                </td>
                <td />
                <td data-label="Amount" className={`tnum px-4 py-3 text-right text-[14px] font-semibold ${surplus < 0 ? "text-danger" : ""}`}>
                  {formatZAR(Math.abs(surplus))}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </Card>

        {draft && writable ? (
          <Card className="mb-4">
            <CardHeader title="Notes for the council" />
            <div className="space-y-3 p-5">
              <Textarea
                name="notes"
                rows={3}
                defaultValue={budget.notes ?? ""}
                placeholder="What changed and why — the questions a council asks"
              />
              <Button type="submit" variant="primary" formAction={saveBudgetLines.bind(null, budget.id)}>
                <Save size={15} /> Save the draft
              </Button>
            </div>
          </Card>
        ) : budget.notes ? (
          <Card className="mb-4">
            <CardHeader title="Notes" />
            <p className="px-5 py-4 text-[13.5px] whitespace-pre-wrap">{budget.notes}</p>
          </Card>
        ) : null}
      </form>

      {draft && writable ? (
        <>
          <Card className="mb-4">
            <CardHeader title="Add a line" subtitle="For something next year that this year did not have" />
            <form action={addBudgetLine.bind(null, budget.id)} className="flex flex-wrap items-end gap-3 p-5">
              <Field label="Account">
                <Select name="accountId" className="w-full sm:w-72">
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Fund" optional>
                <Select name="fundId" defaultValue="" className="w-full sm:w-44">
                  <option value="">All funds</option>
                  {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </Select>
              </Field>
              <Field label="Amount for the year">
                <Input name="amount" inputMode="decimal" className="tnum w-full text-right sm:w-36" />
              </Field>
              <Button type="submit"><Plus size={15} /> Add</Button>
            </form>
          </Card>

          {approver ? (
          <Card>
            <CardHeader
              title="Approve"
              subtitle="Once approved the figures are fixed — this is what the year is measured against"
            />
            <form action={approveBudget.bind(null, budget.id)} className="flex flex-wrap items-end gap-3 p-5">
              <Field label="Approved by" hint="The meeting or the officer that adopted it">
                <Input name="approvedBy" placeholder="Church council, 12 October" className="w-full sm:w-72" />
              </Field>
              <Button type="submit" variant="primary"><Check size={15} /> Approve this budget</Button>
            </form>
            <form action={deleteBudget.bind(null, budget.id)} className="border-t px-5 py-3">
              <Button type="submit" variant="ghost" className="text-danger">
                <Trash2 size={14} /> Discard this draft
              </Button>
            </form>
          </Card>
          ) : (
          <Card>
            <CardHeader
              title={budget.submittedAt ? "Sent to the treasurer" : "Send for approval"}
              subtitle={
                budget.submittedAt
                  ? `Sent ${formatDate(budget.submittedAt)} by ${budget.submittedBy}. You can still adjust it until it is approved.`
                  : "When the figures are right, the treasurer approves it"
              }
            />
            <div className="flex flex-wrap gap-2 p-5">
              {!budget.submittedAt ? (
                <form action={async () => { "use server"; await submitBudgetForApproval(budget.id); }}>
                  <Button type="submit" variant="primary"><Send size={15} /> Send to the treasurer</Button>
                </form>
              ) : null}
              <form action={deleteBudget.bind(null, budget.id)}>
                <Button type="submit" variant="ghost" className="text-danger">
                  <Trash2 size={14} /> Discard this draft
                </Button>
              </form>
            </div>
          </Card>
          )}
        </>
      ) : null}

      <Link href="/budgets" className="mt-4 inline-block text-[13px] text-bronze-600 hover:underline dark:text-bronze-300">
        ← All budgets
      </Link>
    </div>
  );
}
