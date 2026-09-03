import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate, formatZAR, enumLabel } from "@/lib/format";
import { PrintBar, PrintSheet } from "@/components/print-sheet";

const DENOMINATIONS = [200, 100, 50, 20, 10, 5, 2, 1];

export default async function CountSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const batch = await db.batch.findUnique({
    where: { id },
    include: {
      lines: { include: { member: true, fund: true, account: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!batch) notFound();

  const total = batch.lines.reduce((s, l) => s + l.amount, 0);
  const byFund = new Map<string, number>();
  for (const l of batch.lines) {
    byFund.set(l.fund.name, (byFund.get(l.fund.name) ?? 0) + l.amount);
  }

  return (
    <>
      <PrintBar backHref={`/contributions/${batch.id}`} label="Print count sheet" />
      <PrintSheet
        title="Offering Count Sheet"
        period={`${batch.serviceName} · ${formatDate(batch.serviceDate)}`}
        subtitle={`Batch ${batch.batchNumber}`}
      >
        {/* denomination grid — filled in by hand while counting */}
        <div className="mb-6 grid grid-cols-2 gap-6">
          <div>
            <h3 className="mb-2 text-[11px] font-semibold tracking-wide uppercase">
              Cash counted
            </h3>
            <table className="w-full border-collapse text-[10.5px]">
              <thead>
                <tr>
                  <th className="border border-neutral-400 px-2 py-1 text-left">Denomination</th>
                  <th className="border border-neutral-400 px-2 py-1 text-right">Qty</th>
                  <th className="border border-neutral-400 px-2 py-1 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {DENOMINATIONS.map((d) => (
                  <tr key={d}>
                    <td className="tnum border border-neutral-400 px-2 py-1.5">R {d}</td>
                    <td className="border border-neutral-400 px-2 py-1.5" />
                    <td className="border border-neutral-400 px-2 py-1.5" />
                  </tr>
                ))}
                <tr>
                  <td className="border border-neutral-400 px-2 py-1.5 font-semibold">Total cash</td>
                  <td className="border border-neutral-400 px-2 py-1.5" />
                  <td className="border border-neutral-400 px-2 py-1.5" />
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="mb-2 text-[11px] font-semibold tracking-wide uppercase">
              Split by fund
            </h3>
            <table className="w-full border-collapse text-[10.5px]">
              <thead>
                <tr>
                  <th className="border border-neutral-400 px-2 py-1 text-left">Fund</th>
                  <th className="border border-neutral-400 px-2 py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {[...byFund.entries()].map(([name, amount]) => (
                  <tr key={name}>
                    <td className="border border-neutral-400 px-2 py-1.5">{name}</td>
                    <td className="tnum border border-neutral-400 px-2 py-1.5 text-right">
                      {formatZAR(amount)}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="border border-neutral-400 px-2 py-1.5">Total</td>
                  <td className="tnum border border-neutral-400 px-2 py-1.5 text-right">
                    {formatZAR(total)}
                  </td>
                </tr>
              </tbody>
            </table>

            <table className="mt-4 w-full border-collapse text-[10.5px]">
              <tbody>
                <tr>
                  <td className="py-1">Declared total</td>
                  <td className="tnum py-1 text-right">
                    {batch.expectedTotal !== null ? formatZAR(batch.expectedTotal) : "—"}
                  </td>
                </tr>
                <tr>
                  <td className="py-1">Captured total</td>
                  <td className="tnum py-1 text-right">{formatZAR(total)}</td>
                </tr>
                <tr className="font-semibold">
                  <td className="border-t py-1">Variance</td>
                  <td className="tnum border-t py-1 text-right">
                    {batch.expectedTotal !== null
                      ? formatZAR(total - batch.expectedTotal, { parens: true })
                      : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <h3 className="mb-2 text-[11px] font-semibold tracking-wide uppercase">
          Contribution lines
        </h3>
        <table className="w-full border-collapse text-[10.5px]">
          <thead>
            <tr>
              <th className="border-b border-black py-1 text-left font-semibold">Giver</th>
              <th className="w-28 border-b border-black py-1 text-left font-semibold">Fund</th>
              <th className="w-32 border-b border-black py-1 text-left font-semibold">Category</th>
              <th className="w-20 border-b border-black py-1 text-left font-semibold">Method</th>
              <th className="w-20 border-b border-black py-1 text-left font-semibold">Ref</th>
              <th className="w-24 border-b border-black py-1 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {batch.lines.map((l) => (
              <tr key={l.id}>
                <td className="py-1">{l.member?.fullName ?? l.note ?? "Loose / anonymous"}</td>
                <td className="py-1">{l.fund.code}</td>
                <td className="py-1">{l.account.name}</td>
                <td className="py-1">{enumLabel(l.method)}</td>
                <td className="tnum py-1">{l.reference ?? "—"}</td>
                <td className="tnum py-1 text-right">{formatZAR(l.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td colSpan={5} className="border-t-2 border-black py-1.5">Total counted</td>
              <td className="tnum border-t-2 border-black py-1.5 text-right">{formatZAR(total)}</td>
            </tr>
          </tfoot>
        </table>

        {/* dual-control signatures */}
        <div className="mt-12 flex gap-10 break-inside-avoid">
          <SignBlock label="First counter" name={batch.counter1Name} />
          <SignBlock label="Second counter" name={batch.counter2Name} />
          <SignBlock label="Treasurer" name={null} />
        </div>

        <p className="mt-6 text-[9.5px] leading-relaxed text-neutral-500">
          Offerings must be counted by two unrelated people together. Both
          counters sign below. The treasurer reviews and signs before the batch
          is banked and posted.
        </p>
      </PrintSheet>
    </>
  );
}

function SignBlock({ label, name }: { label: string; name: string | null }) {
  return (
    <div className="flex-1">
      <div className="mb-1 h-8 border-b border-neutral-700" />
      <p className="text-[9.5px] tracking-wide text-neutral-600 uppercase">{label}</p>
      {name ? <p className="mt-0.5 text-[10.5px]">{name}</p> : null}
    </div>
  );
}
