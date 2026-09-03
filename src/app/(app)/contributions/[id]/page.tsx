import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Check, Lock, Plus, Printer, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate, formatZAR, enumLabel } from "@/lib/format";
import {
  addContributionLine, advanceBatch, removeContributionLine,
} from "@/lib/actions/finance";
import {
  Badge, Button, Card, CardHeader, Field, Input, PageHeader,
  Select, TableWrap, Td, Th,
} from "@/components/ui";

const STEPS = ["DRAFT", "COUNTED", "REVIEWED", "POSTED"] as const;

export default async function BatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const batch = await db.batch.findUnique({
    where: { id },
    include: {
      lines: {
        include: { member: true, fund: true, account: true },
        orderBy: { createdAt: "asc" },
      },
      createdBy: true,
      reviewedBy: true,
    },
  });

  if (!batch) notFound();

  const [members, funds, accounts] = await Promise.all([
    db.member.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, memberNumber: true },
    }),
    db.fund.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.account.findMany({ where: { type: "INCOME", isActive: true }, orderBy: { code: "asc" } }),
  ]);

  const total = batch.lines.reduce((s, l) => s + l.amount, 0);
  const variance = batch.expectedTotal !== null ? total - batch.expectedTotal : null;
  const locked = batch.status === "POSTED";
  const stepIndex = STEPS.indexOf(batch.status);

  const addLine = addContributionLine.bind(null, batch.id);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title={`Batch ${batch.batchNumber}`}
        description={`${batch.serviceName} · ${formatDate(batch.serviceDate)}`}
        actions={
          <>
            <Link href={`/contributions/${batch.id}/count-sheet`}>
              <Button><Printer size={15} /> Count sheet</Button>
            </Link>
            {!locked && batch.status === "DRAFT" ? (
              <form action={advanceBatch.bind(null, batch.id, "COUNTED")}>
                <Button variant="primary" type="submit">Mark counted</Button>
              </form>
            ) : null}
            {!locked && batch.status === "COUNTED" ? (
              <form action={advanceBatch.bind(null, batch.id, "REVIEWED")}>
                <Button variant="primary" type="submit"><Check size={15} /> Review &amp; approve</Button>
              </form>
            ) : null}
            {!locked && batch.status === "REVIEWED" ? (
              <form action={advanceBatch.bind(null, batch.id, "POSTED")}>
                <Button variant="primary" type="submit"><Lock size={15} /> Post to ledger</Button>
              </form>
            ) : null}
          </>
        }
      />

      {/* lifecycle */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-1 p-4">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-medium ${
                  i < stepIndex
                    ? "bg-success-bg text-success"
                    : i === stepIndex
                      ? "bg-bronze-600 text-white"
                      : "bg-sand-100 text-[var(--text-muted)] dark:bg-sand-800"
                }`}
              >
                {i < stepIndex ? <Check size={13} /> : null}
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </div>
              {i < STEPS.length - 1 ? (
                <div className={`h-px w-6 ${i < stepIndex ? "bg-success" : "bg-[var(--border)]"}`} />
              ) : null}
            </div>
          ))}
          {locked ? (
            <span className="ml-auto flex items-center gap-1.5 text-[12.5px] text-[var(--text-muted)]">
              <Lock size={13} /> Posted — corrections must be made by reversing journal
            </span>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader
              title="Contribution lines"
              subtitle={`${batch.lines.length} lines · ${formatZAR(total)}`}
            />
            {batch.lines.length === 0 ? (
              <p className="px-5 py-12 text-center text-[13px] text-[var(--text-muted)]">
                No lines captured yet. Add the first one below.
              </p>
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Giver</Th>
                    <Th>Fund</Th>
                    <Th>Category</Th>
                    <Th>Method</Th>
                    <Th>Ref</Th>
                    <Th numeric>Amount</Th>
                    {!locked ? <Th /> : null}
                  </tr>
                </thead>
                <tbody>
                  {batch.lines.map((l) => (
                    <tr key={l.id} className="hover:bg-sand-50 dark:hover:bg-sand-800/40">
                      <Td>
                        {l.member ? (
                          <Link href={`/members/${l.member.id}`} className="font-medium hover:underline">
                            {l.member.fullName}
                          </Link>
                        ) : (
                          <span className="text-[var(--text-muted)] italic">
                            {l.note ?? "Loose / anonymous"}
                          </span>
                        )}
                      </Td>
                      <Td><Badge tone="brand">{l.fund.code}</Badge></Td>
                      <Td className="text-[13px]">{l.account.name}</Td>
                      <Td className="text-[var(--text-muted)]">{enumLabel(l.method)}</Td>
                      <Td className="tnum text-[12.5px] text-[var(--text-muted)]">{l.reference ?? "—"}</Td>
                      <Td numeric className="font-medium">{formatZAR(l.amount)}</Td>
                      {!locked ? (
                        <Td className="w-10">
                          <form action={removeContributionLine.bind(null, batch.id, l.id)}>
                            <button
                              type="submit"
                              className="rounded p-1 text-[var(--text-muted)] hover:bg-danger-bg hover:text-danger"
                              aria-label="Remove line"
                            >
                              <Trash2 size={14} />
                            </button>
                          </form>
                        </Td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-sand-50 font-semibold dark:bg-sand-800/40">
                    <td colSpan={5} className="px-4 py-2.5">Total counted</td>
                    <td className="tnum px-4 py-2.5 text-right">{formatZAR(total)}</td>
                    {!locked ? <td /> : null}
                  </tr>
                </tfoot>
              </TableWrap>
            )}
          </Card>

          {!locked ? (
            <Card>
              <CardHeader title="Add a line" subtitle="Leave the giver blank for loose cash" />
              <form action={addLine}>
                <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Giver" optional className="lg:col-span-2">
                    <Select name="memberId" defaultValue="">
                      <option value="">Loose / anonymous</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.fullName} ({m.memberNumber})
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Amount">
                    <Input name="amount" required inputMode="decimal" placeholder="0,00" className="tnum" />
                  </Field>
                  <Field label="Fund">
                    <Select name="fundId" required defaultValue={funds[0]?.id}>
                      {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </Select>
                  </Field>
                  <Field label="Category">
                    <Select name="accountId" required defaultValue={accounts[0]?.id}>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Method">
                    <Select name="method" defaultValue="CASH">
                      <option value="CASH">Cash</option>
                      <option value="EFT">EFT</option>
                      <option value="CARD">Card</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="IN_KIND">In kind</option>
                    </Select>
                  </Field>
                  <Field label="Envelope / reference" optional>
                    <Input name="reference" placeholder="ENV123" />
                  </Field>
                  <Field label="Note" optional className="sm:col-span-2">
                    <Input name="note" />
                  </Field>
                </div>
                <div className="flex justify-end border-t px-5 py-3">
                  <Button type="submit" variant="primary"><Plus size={15} /> Add line</Button>
                </div>
              </form>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Count summary" />
            <div className="space-y-3 p-5">
              <Row label="Declared total" value={batch.expectedTotal !== null ? formatZAR(batch.expectedTotal) : "—"} />
              <Row label="Captured total" value={formatZAR(total)} strong />
              {variance !== null ? (
                <div
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] ${
                    Math.abs(variance) < 0.01
                      ? "bg-success-bg text-success"
                      : "bg-warning-bg text-warning"
                  }`}
                >
                  {Math.abs(variance) < 0.01 ? <Check size={15} /> : <AlertTriangle size={15} />}
                  <span className="flex-1">
                    {Math.abs(variance) < 0.01 ? "Balances to the declared total" : "Variance"}
                  </span>
                  {Math.abs(variance) >= 0.01 ? (
                    <span className="tnum font-semibold">{formatZAR(variance)}</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Control" subtitle="Who handled this batch" />
            <div className="space-y-3 p-5">
              <Row label="First counter" value={batch.counter1Name ?? "—"} />
              <Row label="Second counter" value={batch.counter2Name ?? "—"} />
              <Row label="Counted" value={batch.countedAt ? formatDate(batch.countedAt) : "—"} />
              <Row label="Reviewed by" value={batch.reviewedBy?.name ?? "—"} />
              <Row label="Posted" value={batch.postedAt ? formatDate(batch.postedAt) : "—"} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className={`tnum ${strong ? "text-[15px] font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
