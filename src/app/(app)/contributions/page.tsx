import Link from "next/link";
import { HandCoins, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { financialYearBounds } from "@/lib/finance";
import { today } from "@/lib/demo";
import { formatDate, formatZAR, formatDateInput } from "@/lib/format";
import { createBatch } from "@/lib/actions/finance";
import {
  Badge, Button, Card, CardHeader, EmptyState, Field, Input,
  PageHeader, TableWrap, Td, Th,
} from "@/components/ui";

const STATUS_TONE = {
  DRAFT: "neutral",
  COUNTED: "info",
  REVIEWED: "warning",
  POSTED: "success",
} as const;

export default async function ContributionsPage() {
  const fy = financialYearBounds(today(), 3);

  const [batches, ytd] = await Promise.all([
    db.batch.findMany({
      orderBy: { serviceDate: "desc" },
      take: 30,
      include: { lines: { select: { amount: true } }, reviewedBy: true },
    }),
    db.contributionLine.aggregate({
      where: { batch: { status: "POSTED", serviceDate: { gte: fy.start, lte: fy.end } } },
      _sum: { amount: true },
    }),
  ]);

  const open = batches.filter((b) => b.status !== "POSTED");

  return (
    <div className="mx-auto max-w-[1400px] 2xl:max-w-[1760px]">
      <PageHeader
        title="Contributions"
        description={`${formatZAR(ytd._sum.amount ?? 0)} received year to date · FY ${fy.label}`}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader
              title="Offering batches"
              subtitle="Counted under dual control, reviewed, then posted to the ledger"
            />
            {batches.length === 0 ? (
              <EmptyState
                icon={<HandCoins size={18} />}
                title="No offering batches yet"
                description="Start a batch after a service to capture what was counted."
              />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Batch</Th>
                    <Th>Service</Th>
                    <Th>Counters</Th>
                    <Th>Status</Th>
                    <Th numeric>Lines</Th>
                    <Th numeric>Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => {
                    const total = b.lines.reduce((s, l) => s + l.amount, 0);
                    return (
                      <tr key={b.id} className="hover:bg-sand-50 dark:hover:bg-sand-800/40">
                        <Td label="Batch">
                          <Link
                            href={`/contributions/${b.id}`}
                            className="tnum font-medium hover:underline"
                          >
                            {b.batchNumber}
                          </Link>
                        </Td>
                        <Td label="Service">
                          <span className="block text-[13.5px]">{b.serviceName}</span>
                          <span className="tnum block text-[12px] text-[var(--text-muted)]">
                            {formatDate(b.serviceDate)}
                          </span>
                        </Td>
                        <Td label="Counters" className="text-[12.5px] text-[var(--text-muted)]">
                          {[b.counter1Name, b.counter2Name].filter(Boolean).join(" · ") || "—"}
                        </Td>
                        <Td label="Status">
                          <Badge tone={STATUS_TONE[b.status]}>
                            {b.status.charAt(0) + b.status.slice(1).toLowerCase()}
                          </Badge>
                        </Td>
                        <Td label="Lines" numeric className="text-[var(--text-muted)]">{b.lines.length}</Td>
                        <Td label="Total" numeric className="font-medium">{formatZAR(total)}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableWrap>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Start a batch" subtitle="Two counters, counting together" />
            <form action={createBatch}>
              <div className="space-y-4 p-5">
                <Field label="Service date">
                  <Input
                    name="serviceDate"
                    type="date"
                    required
                    defaultValue={formatDateInput(today())}
                  />
                </Field>
                <Field label="Service">
                  <Input name="serviceName" defaultValue="Sunday Service" />
                </Field>
                <Field label="First counter">
                  <Input name="counter1Name" required placeholder="Name" />
                </Field>
                <Field label="Second counter" hint="Must not be related to the first">
                  <Input name="counter2Name" required placeholder="Name" />
                </Field>
                <Field label="Declared total" hint="Counted before capture, for the variance check" optional>
                  <Input name="expectedTotal" inputMode="decimal" placeholder="0,00" className="tnum" />
                </Field>
              </div>
              <div className="border-t px-5 py-3">
                <Button type="submit" variant="primary" className="w-full">
                  <Plus size={15} /> Start batch
                </Button>
              </div>
            </form>
          </Card>

          {open.length > 0 ? (
            <Card>
              <CardHeader title="Awaiting posting" />
              <ul className="divide-y">
                {open.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/contributions/${b.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-sand-50 dark:hover:bg-sand-800/40"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="tnum truncate text-[13.5px] font-medium">{b.batchNumber}</p>
                        <p className="truncate text-[12px] text-[var(--text-muted)]">
                          {formatDate(b.serviceDate)}
                        </p>
                      </div>
                      <Badge tone={STATUS_TONE[b.status]}>
                        {b.status.charAt(0) + b.status.slice(1).toLowerCase()}
                      </Badge>
                    </Link>
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
