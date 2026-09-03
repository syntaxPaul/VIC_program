import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { financialYearBounds } from "@/lib/finance";
import { today } from "@/lib/demo";
import { formatDate, formatZAR, enumLabel } from "@/lib/format";
import { PrintBar, PrintSheet } from "@/components/print-sheet";

export default async function Register18A() {
  const settings = await db.settings.findFirst();
  if (!settings?.is18aApproved) redirect("/settings");

  const fy = financialYearBounds(today(), settings.financialYearStartMonth);
  const session = await getSession();

  const receipts = await db.receipt18A.findMany({
    where: { donationDate: { gte: fy.start, lte: fy.end } },
    include: { fund: true },
    orderBy: { receiptNumber: "asc" },
  });

  const live = receipts.filter((r) => !r.cancelled);
  const cash = live.filter((r) => !r.isInKind);
  const inKind = live.filter((r) => r.isInKind);
  const total = live.reduce((s, r) => s + r.amount, 0);

  return (
    <>
      <PrintBar backHref="/receipts" label="Print register" />
      <PrintSheet
        title="Section 18A Register"
        period={`${formatDate(fy.start)} to ${formatDate(fy.end)}`}
        subtitle="For reconciliation to the IT3(d) submission"
        generatedBy={session?.name}
        landscape
      >
        <div className="mb-5 grid grid-cols-4 gap-4 text-[11px]">
          <Stat label="Receipts issued" value={String(live.length)} />
          <Stat label="Cash donations" value={String(cash.length)} />
          <Stat label="In-kind donations" value={String(inKind.length)} />
          <Stat label="Total value" value={formatZAR(total)} />
        </div>

        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="w-24 border-b border-black py-1 text-left font-semibold">Receipt no.</th>
              <th className="w-20 border-b border-black py-1 text-left font-semibold">Date</th>
              <th className="border-b border-black py-1 text-left font-semibold">Donor</th>
              <th className="w-20 border-b border-black py-1 text-left font-semibold">Nature</th>
              <th className="w-28 border-b border-black py-1 text-left font-semibold">Tax ref</th>
              <th className="w-28 border-b border-black py-1 text-left font-semibold">Fund</th>
              <th className="w-16 border-b border-black py-1 text-left font-semibold">Type</th>
              <th className="w-24 border-b border-black py-1 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {receipts.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-4 text-neutral-500 italic">
                  No receipts issued in this period. A nil declaration is still
                  required from SARS.
                </td>
              </tr>
            ) : (
              receipts.map((r) => (
                <tr key={r.id} className={r.cancelled ? "text-neutral-400 line-through" : ""}>
                  <td className="tnum py-1">{r.receiptNumber}</td>
                  <td className="tnum py-1">{formatDate(r.donationDate)}</td>
                  <td className="py-1">{r.donorName}</td>
                  <td className="py-1">{enumLabel(r.donorNature)}</td>
                  <td className="tnum py-1">{r.donorTaxRef ?? "—"}</td>
                  <td className="py-1">{r.fund.name}</td>
                  <td className="py-1">{r.isInKind ? "In kind" : "Cash"}</td>
                  <td className="tnum py-1 text-right">{formatZAR(r.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td colSpan={7} className="border-t-2 border-black py-1.5">
                Total (excluding cancelled)
              </td>
              <td className="tnum border-t-2 border-black py-1.5 text-right">
                {formatZAR(total)}
              </td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-5 text-[9.5px] leading-relaxed text-neutral-500">
          Section 18A approved entities must submit IT3(d) third-party data
          bi-annually by 31 October (1 March – 31 August) and annually by 31 May
          (full year of assessment), each accompanied by an IT3-02 declaration.
          An entity that issued no receipts must still file a nil declaration.
          Cancelled receipts are shown struck through and excluded from the
          total.
        </p>
      </PrintSheet>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-neutral-400 p-2">
      <p className="text-neutral-600 uppercase">{label}</p>
      <p className="tnum mt-0.5 text-[13px] font-semibold">{value}</p>
    </div>
  );
}
