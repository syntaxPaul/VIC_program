import Link from "next/link";
import { Building2, Plus, Save } from "lucide-react";
import { db } from "@/lib/db";
import { can } from "@/lib/roles";
import { requireArea } from "@/lib/guards";
import { formatZAR } from "@/lib/format";
import { saveDepartment } from "@/lib/actions/departments";
import {
  Badge, Button, Card, CardHeader, Field, Input, PageHeader, Textarea,
} from "@/components/ui";

export default async function DepartmentsPage() {
  const session = await requireArea("departments");
  const writable = can(session.role, "departments", true);

  const departments = await db.department.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      budgets: {
        where: { status: "APPROVED", isActive: true },
        include: { lines: { include: { account: { select: { type: true } } } } },
      },
    },
  });

  return (
    <div className="mx-auto max-w-[1000px] 2xl:max-w-[1240px]">
      <PageHeader
        title="Departments"
        description="Each ministry of the church, who leads it, and the budget it is working to."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {departments.map((d) => {
          const spend = d.budgets
            .flatMap((b) => b.lines)
            .filter((l) => l.account.type === "EXPENSE")
            .reduce((s, l) => s + l.amount, 0);
          return (
            <Card key={d.id}>
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    {d.name}
                    <span className="text-[11px] font-normal text-[var(--text-muted)]">{d.code}</span>
                    {!d.isActive ? <Badge>Inactive</Badge> : null}
                  </span>
                }
                subtitle={d.description ?? undefined}
              />
              <div className="space-y-1 px-5 py-3 text-[13.5px]">
                <p>
                  <span className="text-[var(--text-muted)]">Leader · </span>
                  {d.leaderName ?? <span className="text-[var(--text-muted)]">not set</span>}
                  {d.leaderPhone ? <span className="text-[var(--text-muted)]"> · {d.leaderPhone}</span> : null}
                </p>
                <p>
                  <span className="text-[var(--text-muted)]">Approved budget · </span>
                  {d.budgets.length ? formatZAR(spend) : <span className="text-[var(--text-muted)]">none yet</span>}
                </p>
              </div>
              {writable ? (
                <details className="border-t">
                  <summary className="cursor-pointer px-5 py-2.5 text-[13px] font-medium text-bronze-600 dark:text-bronze-300">
                    Edit
                  </summary>
                  <form action={saveDepartment.bind(null, d.id)} className="grid grid-cols-1 gap-3 px-5 pb-4 sm:grid-cols-2">
                    <Field label="Name"><Input name="name" defaultValue={d.name} required /></Field>
                    <Field label="Code"><Input name="code" defaultValue={d.code} required /></Field>
                    <Field label="Leader" optional><Input name="leaderName" defaultValue={d.leaderName ?? ""} /></Field>
                    <Field label="Leader's phone" optional><Input name="leaderPhone" defaultValue={d.leaderPhone ?? ""} inputMode="tel" /></Field>
                    <Field label="What it does" optional className="sm:col-span-2">
                      <Textarea name="description" rows={2} defaultValue={d.description ?? ""} />
                    </Field>
                    <div className="sm:col-span-2">
                      <Button type="submit" variant="primary"><Save size={14} /> Save</Button>
                    </div>
                  </form>
                </details>
              ) : null}
            </Card>
          );
        })}
      </div>

      {writable ? (
        <Card className="mt-4">
          <CardHeader title="Add a department" />
          <form action={saveDepartment.bind(null, null)} className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
            <Field label="Name"><Input name="name" required placeholder="e.g. Prayer Ministry" /></Field>
            <Field label="Code"><Input name="code" required placeholder="PRAY" /></Field>
            <Field label="Leader" optional><Input name="leaderName" /></Field>
            <Field label="Leader's phone" optional><Input name="leaderPhone" inputMode="tel" /></Field>
            <div className="sm:col-span-2">
              <Button type="submit" variant="primary"><Plus size={14} /> Add</Button>
            </div>
          </form>
        </Card>
      ) : null}

      <p className="mt-4 text-[12.5px] text-[var(--text-muted)]">
        <Building2 size={12} className="mr-1 inline" />
        Budgets are drafted per department on the{" "}
        <Link href="/budgets" className="text-bronze-600 hover:underline dark:text-bronze-300">Budgets</Link>{" "}
        page and approved by the treasurer.
      </p>
    </div>
  );
}
