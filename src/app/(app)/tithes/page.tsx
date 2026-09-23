import Link from "next/link";
import { ChevronLeft, ChevronRight, CircleCheck, HandCoins, Printer, Users, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { today } from "@/lib/demo";
import { can } from "@/lib/roles";
import { requireArea } from "@/lib/guards";
import { formatDate, formatDateInput, formatZAR, formatZARCompact } from "@/lib/format";
import { GIVING_TYPES, givingForMonth, monthOf } from "@/lib/giving";
import { recordGiving } from "@/lib/actions/tithes";
import { KpiGrid, KpiTile } from "@/components/kpi";
import { Badge, Button, Card, CardHeader, Field, Input, PageHeader, Select, TableWrap, Td, Th } from "@/components/ui";

const METHOD_LABEL: Record<string, string> = { CASH: "Cash", EFT: "EFT", CARD: "Card", CHEQUE: "Cheque", IN_KIND: "In kind", DEBIT_ORDER: "Debit order" };

export default async function TithesPage({ searchParams }: { searchParams: Promise<{ m?: string; saved?: string }> }) {
  const session = await requireArea("tithes");
  const writable = can(session.role, "tithes", true);
  const sp = await searchParams;
  const now = today();
  const month = monthOf(sp.m, now);

  const [giving, members] = await Promise.all([
    givingForMonth(month.start, month.end),
    writable
      ? db.member.findMany({
          where: { deletedAt: null, status: "ACTIVE" },
          orderBy: [{ surname: "asc" }, { fullName: "asc" }],
          select: { id: true, fullName: true, memberNumber: true },
        })
      : Promise.resolve([]),
  ]);

  const offerings = giving.grandTotal - giving.totals.TITHE;

  return (
    <div className="mx-auto max-w-[1200px] 2xl:max-w-[1500px]">
      <PageHeader
        title="Tithes & offerings"
        description="Who gave, and the total — by the month."
        actions={
          <>
            <Link href={`/tithes?m=${month.prevKey}`}><Button aria-label="Previous month"><ChevronLeft size={15} /></Button></Link>
            <span className="px-1 text-[14px] font-medium whitespace-nowrap">{month.label}</span>
            <Link href={`/tithes?m=${month.nextKey}`}><Button aria-label="Next month"><ChevronRight size={15} /></Button></Link>
            <Link href={`/tithes/print?m=${month.key}`}><Button><Printer size={15} /> Print</Button></Link>
          </>
        }
      />

      {sp.saved ? (
        <p className="mb-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-[13px] text-success">
          <CircleCheck size={15} /> Recorded. It is in that day&rsquo;s batch, waiting to be counted and posted.
        </p>
      ) : null}

      <KpiGrid>
        <KpiTile label="Tithes" value={formatZARCompact(giving.totals.TITHE)} comparison={month.label} icon={<HandCoins size={15} />} accent />
        <KpiTile label="People who tithed" value={String(giving.tithers.length)} comparison="named members" icon={<Users size={15} />} />
        <KpiTile label="Offerings" value={formatZARCompact(offerings)} comparison="all other giving" icon={<Wallet size={15} />} />
        <KpiTile label="Total received" value={formatZARCompact(giving.grandTotal)} comparison={giving.unposted ? `${giving.unposted} not yet posted` : "all posted"} icon={<Wallet size={15} />} />
      </KpiGrid>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Who tithed" subtitle={`${month.label} · ${formatZAR(giving.totals.TITHE)} in total`} />
            {giving.tithers.length ? (
              <TableWrap>
                <thead>
                  <tr><Th>Member</Th><Th>Number</Th><Th numeric>Times</Th><Th numeric>Total</Th></tr>
                </thead>
                <tbody>
                  {giving.tithers.map((t) => (
                    <tr key={t.id}>
                      <Td label="Member"><Link href={`/members/${t.id}`} className="hover:underline">{t.name}</Link></Td>
                      <Td label="Number" className="tnum text-[var(--text-muted)]">{t.number}</Td>
                      <Td label="Times" numeric>{t.count}</Td>
                      <Td label="Total" numeric className="font-medium">{formatZAR(t.total)}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            ) : (
              <p className="px-5 py-6 text-center text-[13px] text-[var(--text-muted)]">No named tithes recorded this month.</p>
            )}
            {giving.anonymousTithes > 0 ? (
              <p className="border-t px-5 py-2.5 text-[12.5px] text-[var(--text-muted)]">
                Plus {formatZAR(giving.anonymousTithes)} in tithes given without a name.
              </p>
            ) : null}
          </Card>

          <Card>
            <CardHeader title="By kind" />
            <div className="divide-y">
              {GIVING_TYPES.map((g) => (
                <div key={g.key} className="flex items-center justify-between px-5 py-2.5 text-[13.5px]">
                  <span>{g.label}</span>
                  <span className="tnum">{formatZAR(giving.totals[g.key])}</span>
                </div>
              ))}
              <div className="flex items-center justify-between bg-sand-50 px-5 py-2.5 text-[13.5px] font-semibold dark:bg-sand-800/40">
                <span>Total</span>
                <span className="tnum">{formatZAR(giving.grandTotal)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Every entry" subtitle="Newest first" />
            {giving.lines.length ? (
              <TableWrap>
                <thead>
                  <tr><Th>Giver</Th><Th>Date</Th><Th>Kind</Th><Th>Method</Th><Th>Status</Th><Th numeric>Amount</Th></tr>
                </thead>
                <tbody>
                  {giving.lines.map((l) => (
                    <tr key={l.id}>
                      <Td label="Giver">{l.member?.fullName ?? <span className="text-[var(--text-muted)]">Loose / no name</span>}</Td>
                      <Td label="Date" className="text-[var(--text-muted)]">{formatDate(l.batch.serviceDate)}</Td>
                      <Td label="Kind">{l.type.label}</Td>
                      <Td label="Method" className="text-[var(--text-muted)]">{METHOD_LABEL[l.method] ?? l.method}</Td>
                      <Td label="Status">
                        <Link href={`/contributions/${l.batch.id}`}>
                          {l.batch.status === "POSTED" ? <Badge tone="success">Posted</Badge> : <Badge tone="warning">To count</Badge>}
                        </Link>
                      </Td>
                      <Td label="Amount" numeric className="font-medium">{formatZAR(l.amount)}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            ) : (
              <p className="px-5 py-6 text-center text-[13px] text-[var(--text-muted)]">Nothing recorded for {month.label}.</p>
            )}
          </Card>
        </div>

        {writable ? (
          <Card className="lg:sticky lg:top-4">
            <CardHeader title="Record giving" subtitle="Goes into that day's batch for counting" />
            <form action={recordGiving} className="grid grid-cols-1 gap-3 p-5">
              <Field label="Member" optional hint="Leave empty for loose offerings">
                <Select name="memberId" defaultValue="">
                  <option value="">No name — loose</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.fullName} · {m.memberNumber}</option>)}
                </Select>
              </Field>
              <Field label="Kind">
                <Select name="type" defaultValue="TITHE">
                  {GIVING_TYPES.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount (R)"><Input name="amount" inputMode="decimal" required placeholder="0,00" /></Field>
                <Field label="Method">
                  <Select name="method" defaultValue="CASH">
                    <option value="CASH">Cash</option>
                    <option value="EFT">EFT</option>
                    <option value="CARD">Card</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="DEBIT_ORDER">Debit order</option>
                  </Select>
                </Field>
              </div>
              <Field label="Date"><Input name="date" type="date" required defaultValue={formatDateInput(now)} /></Field>
              <Field label="Reference" optional hint="Envelope number or EFT reference"><Input name="reference" /></Field>
              <Button type="submit" variant="primary"><HandCoins size={15} /> Record it</Button>
            </form>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
