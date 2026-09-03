import Link from "next/link";
import { ArrowLeftRight, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { fundBalances, financialYearBounds } from "@/lib/finance";
import { today } from "@/lib/demo";
import { formatZAR, enumLabel } from "@/lib/format";
import { transferBetweenFunds } from "@/lib/actions/finance";
import {
  Badge, Button, Card, CardHeader, Field, Input, PageHeader,
  Select, TableWrap, Td, Th,
} from "@/components/ui";

export default async function FundsPage() {
  const fy = financialYearBounds(today(), 3);
  const [balances, funds, transfers] = await Promise.all([
    fundBalances({ start: fy.start, end: fy.end }),
    db.fund.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.fundTransfer.findMany({
      include: { fromFund: true, toFund: true },
      orderBy: { date: "desc" },
      take: 8,
    }),
  ]);

  const totals = balances.reduce(
    (a, f) => ({
      opening: a.opening + f.opening,
      income: a.income + f.income,
      expense: a.expense + f.expense,
      transfers: a.transfers + f.transfers,
      closing: a.closing + f.closing,
    }),
    { opening: 0, income: 0, expense: 0, transfers: 0, closing: 0 },
  );

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Funds"
        description={`Fund balances for financial year ${fy.label}. A fund is a pot of money defined by purpose, not by bank account.`}
        actions={
          <Link href="/reports/fund-balances">
            <Button>Printable report</Button>
          </Link>
        }
      />

      <Card className="mb-4 overflow-hidden">
        <CardHeader title="Fund balances" subtitle="Opening + income − expenditure ± transfers = closing" />
        <TableWrap>
          <thead>
            <tr>
              <Th>Fund</Th>
              <Th>Class</Th>
              <Th numeric>Opening</Th>
              <Th numeric>Income</Th>
              <Th numeric>Expenditure</Th>
              <Th numeric>Transfers</Th>
              <Th numeric>Closing</Th>
            </tr>
          </thead>
          <tbody>
            {balances.map((f) => (
              <tr key={f.id} className="hover:bg-sand-50 dark:hover:bg-sand-800/40">
                <Td>
                  <span className="font-medium">{f.name}</span>
                  <span className="tnum ml-2 text-[12px] text-[var(--text-muted)]">{f.code}</span>
                </Td>
                <Td>
                  <Badge tone={f.fundClass === "UNRESTRICTED" ? "neutral" : "warning"}>
                    {f.fundClass === "UNRESTRICTED" ? "Unrestricted" : "Restricted"}
                  </Badge>
                </Td>
                <Td numeric className="text-[var(--text-muted)]">{formatZAR(f.opening)}</Td>
                <Td numeric className="text-success">{formatZAR(f.income)}</Td>
                <Td numeric className="text-danger">{formatZAR(f.expense)}</Td>
                <Td numeric className={f.transfers === 0 ? "text-[var(--text-muted)]" : ""}>
                  {f.transfers === 0 ? "—" : formatZAR(f.transfers)}
                </Td>
                <Td numeric className="font-semibold">{formatZAR(f.closing)}</Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-sand-50 font-semibold dark:bg-sand-800/40">
              <td className="px-4 py-2.5" colSpan={2}>Total</td>
              <td className="tnum px-4 py-2.5 text-right">{formatZAR(totals.opening)}</td>
              <td className="tnum px-4 py-2.5 text-right">{formatZAR(totals.income)}</td>
              <td className="tnum px-4 py-2.5 text-right">{formatZAR(totals.expense)}</td>
              <td className="tnum px-4 py-2.5 text-right">{formatZAR(totals.transfers)}</td>
              <td className="tnum px-4 py-2.5 text-right">{formatZAR(totals.closing)}</td>
            </tr>
          </tfoot>
        </TableWrap>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Transfer between funds"
            subtitle="Releases a restricted fund, or moves money to where it is needed"
          />
          <form action={transferBetweenFunds}>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="From fund">
                <Select name="fromFundId" required defaultValue="">
                  <option value="" disabled>Choose…</option>
                  {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </Select>
              </Field>
              <Field label="To fund">
                <Select name="toFundId" required defaultValue="">
                  <option value="" disabled>Choose…</option>
                  {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </Select>
              </Field>
              <Field label="Amount">
                <Input name="amount" required inputMode="decimal" placeholder="0,00" className="tnum" />
              </Field>
              <Field label="Date">
                <Input name="date" type="date" required />
              </Field>
              <Field label="Reason" className="sm:col-span-2">
                <Input name="reason" required placeholder="e.g. Building fund released for roof repair" />
              </Field>
            </div>
            <div className="flex justify-end border-t px-5 py-3">
              <Button type="submit" variant="primary">
                <ArrowLeftRight size={15} /> Record transfer
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Recent transfers" />
          {transfers.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] text-[var(--text-muted)]">
              No transfers recorded.
            </p>
          ) : (
            <ul className="divide-y">
              {transfers.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <ArrowLeftRight size={15} className="shrink-0 text-[var(--text-muted)]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px]">
                      {t.fromFund.name} → {t.toFund.name}
                    </p>
                    <p className="truncate text-[12px] text-[var(--text-muted)]">{t.reason}</p>
                  </div>
                  <span className="tnum shrink-0 text-[13.5px] font-medium">
                    {formatZAR(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
