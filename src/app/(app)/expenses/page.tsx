import Link from "next/link";
import { Plus, Receipt, Search } from "lucide-react";
import { db } from "@/lib/db";
import { financialYearBounds } from "@/lib/finance";
import { today } from "@/lib/demo";
import { formatDate, formatZAR, enumLabel } from "@/lib/format";
import {
  Badge, Button, Card, EmptyState, Input, PageHeader, Select,
  TableWrap, Td, Th,
} from "@/components/ui";
import type { Prisma } from "@/generated/prisma";

const PAGE_SIZE = 30;

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; account?: string; fund?: string; from?: string; to?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const fy = financialYearBounds(today(), 3);

  const q = sp.q?.trim() ?? "";
  const from = sp.from ? new Date(sp.from) : fy.start;
  const to = sp.to ? new Date(`${sp.to}T23:59:59`) : fy.end;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.TransactionWhereInput = {
    deletedAt: null,
    type: "PAYMENT",
    date: { gte: from, lte: to },
    ...(q
      ? { OR: [{ description: { contains: q } }, { payee: { contains: q } }, { reference: { contains: q } }] }
      : {}),
    ...(sp.account ? { accountId: sp.account } : {}),
    ...(sp.fund ? { fundId: sp.fund } : {}),
  };

  const [rows, total, agg, accounts, funds] = await Promise.all([
    db.transaction.findMany({
      where,
      include: { account: true, fund: true },
      orderBy: { date: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.transaction.count({ where }),
    db.transaction.aggregate({ where, _sum: { amount: true } }),
    db.account.findMany({ where: { type: "EXPENSE", isActive: true }, orderBy: { code: "asc" } }),
    db.fund.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  const pages = Math.ceil(total / PAGE_SIZE);
  const filtered = Boolean(q || sp.account || sp.fund || sp.from || sp.to);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Expenses"
        description={`${total} payments · ${formatZAR(agg._sum.amount ?? 0)} total`}
        actions={
          <Link href="/expenses/new">
            <Button variant="primary">
              <Plus size={15} /> Record payment
            </Button>
          </Link>
        }
      />

      <Card className="mb-4">
        <form className="flex flex-wrap items-end gap-3 p-3">
          <div className="relative min-w-52 flex-1">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input name="q" defaultValue={q} placeholder="Search description or payee…" className="pl-9" />
          </div>
          <Select name="account" defaultValue={sp.account ?? ""} className="w-56">
            <option value="">All categories</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
            ))}
          </Select>
          <Select name="fund" defaultValue={sp.fund ?? ""} className="w-44">
            <option value="">All funds</option>
            {funds.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </Select>
          <Input name="from" type="date" defaultValue={sp.from ?? ""} className="w-40" />
          <Input name="to" type="date" defaultValue={sp.to ?? ""} className="w-40" />
          <Button type="submit">Apply</Button>
          {filtered ? (
            <Link href="/expenses"><Button type="button" variant="ghost">Clear</Button></Link>
          ) : null}
        </form>
      </Card>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={<Search size={18} />}
              title="No payments match these filters"
              action={<Link href="/expenses"><Button>Clear filters</Button></Link>}
            />
          ) : (
            <EmptyState
              icon={<Receipt size={18} />}
              title="No payments recorded yet"
              description="Record your first payment to start tracking church expenditure."
              action={
                <Link href="/expenses/new">
                  <Button variant="primary"><Plus size={15} /> Record payment</Button>
                </Link>
              }
            />
          )
        ) : (
          <>
            <TableWrap>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Description</Th>
                  <Th>Category</Th>
                  <Th>Fund</Th>
                  <Th>Method</Th>
                  <Th numeric>Amount</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="hover:bg-sand-50 dark:hover:bg-sand-800/40">
                    <Td className="tnum whitespace-nowrap">{formatDate(t.date)}</Td>
                    <Td>
                      <span className="block font-medium">{t.description}</span>
                      {t.payee ? (
                        <span className="block text-[12px] text-[var(--text-muted)]">{t.payee}</span>
                      ) : null}
                    </Td>
                    <Td>
                      <span className="tnum text-[var(--text-muted)]">{t.account.code}</span>{" "}
                      {t.account.name}
                    </Td>
                    <Td>
                      <Badge tone={t.fund.fundClass === "UNRESTRICTED" ? "neutral" : "warning"}>
                        {t.fund.code}
                      </Badge>
                    </Td>
                    <Td className="text-[var(--text-muted)]">{enumLabel(t.method)}</Td>
                    <Td numeric className="font-medium">{formatZAR(t.amount)}</Td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-sand-50 font-semibold dark:bg-sand-800/40">
                  <td colSpan={5} className="px-4 py-2.5">
                    Total {filtered ? "(filtered)" : ""}
                  </td>
                  <td className="tnum px-4 py-2.5 text-right">{formatZAR(agg._sum.amount ?? 0)}</td>
                </tr>
              </tfoot>
            </TableWrap>

            {pages > 1 ? (
              <div className="flex items-center justify-between border-t px-4 py-3 text-[13px]">
                <span className="text-[var(--text-muted)]">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                </span>
                <div className="flex gap-2">
                  {page > 1 ? (
                    <Link href={{ pathname: "/expenses", query: { ...sp, page: page - 1 } }}>
                      <Button size="sm">Previous</Button>
                    </Link>
                  ) : null}
                  {page < pages ? (
                    <Link href={{ pathname: "/expenses", query: { ...sp, page: page + 1 } }}>
                      <Button size="sm">Next</Button>
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        )}
      </Card>
    </div>
  );
}
