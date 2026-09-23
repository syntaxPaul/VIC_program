import { db } from "@/lib/db";
import { financialYearBounds } from "@/lib/finance";
import { today } from "@/lib/demo";
import { formatZAR } from "@/lib/format";
import { Badge, Card, CardHeader, PageHeader, TableWrap, Td, Th } from "@/components/ui";
import type { AccountType } from "@/generated/prisma";

const GROUPS: { type: AccountType; label: string; blurb: string }[] = [
  { type: "ASSET", label: "1000 · Assets", blurb: "What the church owns" },
  { type: "LIABILITY", label: "2000 · Liabilities", blurb: "What the church owes" },
  { type: "NET_ASSET", label: "3000 · Fund balances", blurb: "Accumulated funds by restriction" },
  { type: "INCOME", label: "4000 · Income", blurb: "Tithes, offerings and other receipts" },
  { type: "EXPENSE", label: "5000 · Expenditure", blurb: "Every category the church spends on" },
];

export default async function AccountsPage() {
  const fy = financialYearBounds(today(), 3);

  const [accounts, activity] = await Promise.all([
    db.account.findMany({ orderBy: { code: "asc" } }),
    db.transaction.groupBy({
      by: ["accountId"],
      where: { deletedAt: null, date: { gte: fy.start, lte: fy.end } },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const byAccount = new Map(
    activity.map((a) => [a.accountId, { total: a._sum.amount ?? 0, count: a._count }]),
  );

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Chart of accounts"
        description={`The categories every transaction is booked to. Activity shown for financial year ${fy.label}.`}
      />

      <div className="space-y-4">
        {GROUPS.map((g) => {
          const rows = accounts.filter((a) => a.type === g.type);
          if (rows.length === 0) return null;
          const groupTotal = rows.reduce((s, a) => s + (byAccount.get(a.id)?.total ?? 0), 0);

          return (
            <Card key={g.type} className="overflow-hidden">
              <CardHeader title={g.label} subtitle={g.blurb} />
              <TableWrap>
                <thead>
                  <tr>
                    <Th className="w-24">Code</Th>
                    <Th>Account</Th>
                    <Th numeric className="w-28">Entries</Th>
                    <Th numeric className="w-40">This year</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => {
                    const act = byAccount.get(a.id);
                    return (
                      <tr key={a.id} className="hover:bg-sand-50 dark:hover:bg-sand-800/40">
                        <Td label="Code" className="tnum text-[var(--text-muted)]">{a.code}</Td>
                        <Td label="Account">
                          <span className={a.isActive ? "" : "text-[var(--text-muted)]"}>{a.name}</span>
                          {!a.isActive ? <Badge className="ml-2">Inactive</Badge> : null}
                        </Td>
                        <Td label="Entries" numeric className="text-[var(--text-muted)]">{act?.count ?? "—"}</Td>
                        <Td label="This year" numeric className={act ? "font-medium" : "text-[var(--text-muted)]"}>
                          {act ? formatZAR(act.total) : "—"}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
                {g.type === "INCOME" || g.type === "EXPENSE" ? (
                  <tfoot>
                    <tr className="bg-sand-50 font-semibold dark:bg-sand-800/40">
                      <td colSpan={3} className="px-4 py-2.5">
                        Total {g.type === "INCOME" ? "income" : "expenditure"}
                      </td>
                      <td data-label="This year" className="tnum px-4 py-2.5 text-right">{formatZAR(groupTotal)}</td>
                    </tr>
                  </tfoot>
                ) : null}
              </TableWrap>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
