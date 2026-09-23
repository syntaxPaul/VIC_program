import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, FileCheck, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { financialYearBounds } from "@/lib/finance";
import { today } from "@/lib/demo";
import { formatDate, formatZAR, enumLabel } from "@/lib/format";
import {
  Badge, Button, Card, CardHeader, EmptyState, PageHeader,
  TableWrap, Td, Th,
} from "@/components/ui";

export default async function ReceiptsPage() {
  const settings = await db.settings.findFirst();
  if (!settings?.is18aApproved) redirect("/settings");

  const fy = financialYearBounds(today(), settings.financialYearStartMonth);

  const [receipts, agg] = await Promise.all([
    db.receipt18A.findMany({
      include: { fund: true, member: true },
      orderBy: { issuedAt: "desc" },
      take: 100,
    }),
    db.receipt18A.aggregate({
      where: { cancelled: false, donationDate: { gte: fy.start, lte: fy.end } },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return (
    <div className="mx-auto max-w-[1300px]">
      <PageHeader
        title="Section 18A receipts"
        description={`${agg._count} issued this financial year · ${formatZAR(agg._sum.amount ?? 0)}`}
        actions={
          <>
            <Link href="/reports/18a-register"><Button>18A register</Button></Link>
            <Link href="/receipts/new">
              <Button variant="primary"><Plus size={15} /> Issue receipt</Button>
            </Link>
          </>
        }
      />

      <Card className="mb-4 border-info/30 bg-info-bg/50 dark:bg-info/10">
        <div className="flex items-start gap-3 p-4">
          <AlertTriangle size={17} className="mt-0.5 shrink-0 text-info" />
          <div className="text-[13px] leading-relaxed">
            <p className="font-medium">Ordinary tithes and offerings are not deductible</p>
            <p className="mt-0.5 text-[var(--text-muted)]">
              Religious activity sits in Part I of the Ninth Schedule; Section
              18A deductions require Part II activities such as welfare and
              humanitarian relief. Receipts can only be issued against funds
              flagged 18A eligible. Submissions to SARS are due by 31 October
              and 31 May, and a nil declaration is required even if nothing
              was issued.
            </p>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Issued receipts" />
        {receipts.length === 0 ? (
          <EmptyState
            icon={<FileCheck size={18} />}
            title="No receipts issued yet"
            description="Issue a receipt against a fund flagged as 18A eligible."
            action={
              <Link href="/receipts/new">
                <Button variant="primary"><Plus size={15} /> Issue receipt</Button>
              </Link>
            }
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Receipt no.</Th>
                <Th>Donor</Th>
                <Th>Fund</Th>
                <Th>Donation date</Th>
                <Th>Type</Th>
                <Th numeric>Amount</Th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.id} className="hover:bg-sand-50 dark:hover:bg-sand-800/40">
                  <Td label="Receipt no.">
                    <Link href={`/receipts/${r.id}`} className="tnum font-medium hover:underline">
                      {r.receiptNumber}
                    </Link>
                    {r.cancelled ? <Badge tone="danger" className="ml-2">Cancelled</Badge> : null}
                  </Td>
                  <Td label="Donor">
                    <span className="block">{r.donorName}</span>
                    <span className="block text-[12px] text-[var(--text-muted)]">
                      {enumLabel(r.donorNature)}
                    </span>
                  </Td>
                  <Td label="Fund">{r.fund.name}</Td>
                  <Td label="Donation date" className="tnum">{formatDate(r.donationDate)}</Td>
                  <Td label="Type">
                    <Badge tone={r.isInKind ? "warning" : "neutral"}>
                      {r.isInKind ? "In kind" : "Cash"}
                    </Badge>
                  </Td>
                  <Td label="Amount" numeric className={r.cancelled ? "line-through opacity-50" : "font-medium"}>
                    {formatZAR(r.amount)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
