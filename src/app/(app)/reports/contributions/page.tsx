import { getSession } from "@/lib/auth";
import { contributionsByMember, financialYearBounds } from "@/lib/finance";
import { today } from "@/lib/demo";
import { formatDate, formatZAR } from "@/lib/format";
import { PrintBar, PrintSheet } from "@/components/print-sheet";

export default async function ContributionsReport() {
  const fy = financialYearBounds(today(), 3);
  const session = await getSession();
  const rows = await contributionsByMember({ start: fy.start, end: today() });
  const total = rows.reduce((s, r) => s + r.total, 0);

  return (
    <>
      <PrintBar backHref="/reports" />
      <PrintSheet
        title="Contributions by Member"
        period={`${formatDate(fy.start)} to ${formatDate(today())}`}
        subtitle="Confidential — for pastoral and treasury use"
        generatedBy={session?.name}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-10 border-b border-black py-1.5 text-left font-semibold">#</th>
              <th className="w-24 border-b border-black py-1.5 text-left font-semibold">Number</th>
              <th className="border-b border-black py-1.5 text-left font-semibold">Member</th>
              <th className="w-24 border-b border-black py-1.5 text-right font-semibold">Gifts</th>
              <th className="w-32 border-b border-black py-1.5 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-neutral-500 italic">
                  No attributed contributions in this period.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="tnum py-1.5 text-neutral-500">{i + 1}</td>
                  <td className="tnum py-1.5 text-neutral-600">{r.number}</td>
                  <td className="py-1.5">{r.name}</td>
                  <td className="tnum py-1.5 text-right text-neutral-600">{r.count}</td>
                  <td className="tnum py-1.5 text-right font-medium">{formatZAR(r.total)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td colSpan={3} className="border-t-2 border-black py-2">
                Total attributed contributions
              </td>
              <td className="tnum border-t-2 border-black py-2 text-right">
                {rows.reduce((s, r) => s + r.count, 0)}
              </td>
              <td className="tnum border-t-2 border-black py-2 text-right">{formatZAR(total)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-6 text-[10px] leading-relaxed text-neutral-500">
          Loose and anonymous offerings are excluded from this report as they
          cannot be attributed to a giver. Ordinary tithes and offerings to a
          church are generally not deductible under Section 18A.
        </p>
      </PrintSheet>
    </>
  );
}
