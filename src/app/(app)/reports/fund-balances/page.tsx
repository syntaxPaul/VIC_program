import { getSession } from "@/lib/auth";
import { financialYearBounds, fundBalances } from "@/lib/finance";
import { today } from "@/lib/demo";
import { formatDate, formatZAR } from "@/lib/format";
import { PrintBar, PrintSheet } from "@/components/print-sheet";

export default async function FundBalancesReport() {
  const fy = financialYearBounds(today(), 3);
  const session = await getSession();
  const rows = await fundBalances({ start: fy.start, end: today() });

  const t = rows.reduce(
    (a, f) => ({
      opening: a.opening + f.opening,
      income: a.income + f.income,
      expense: a.expense + f.expense,
      transfers: a.transfers + f.transfers,
      closing: a.closing + f.closing,
    }),
    { opening: 0, income: 0, expense: 0, transfers: 0, closing: 0 },
  );

  const unrestricted = rows.filter((r) => r.fundClass === "UNRESTRICTED");
  const restricted = rows.filter((r) => r.fundClass !== "UNRESTRICTED");

  return (
    <>
      <PrintBar backHref="/reports" />
      <PrintSheet
        title="Fund Balance Report"
        period={`${formatDate(fy.start)} to ${formatDate(today())}`}
        subtitle="How much of each fund is available to spend"
        generatedBy={session?.name}
        landscape
      >
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border-b border-black py-1.5 text-left font-semibold">Fund</th>
              <th className="w-28 border-b border-black py-1.5 text-right font-semibold">Opening</th>
              <th className="w-28 border-b border-black py-1.5 text-right font-semibold">Income</th>
              <th className="w-28 border-b border-black py-1.5 text-right font-semibold">Expenditure</th>
              <th className="w-28 border-b border-black py-1.5 text-right font-semibold">Transfers</th>
              <th className="w-28 border-b border-black py-1.5 text-right font-semibold">Closing</th>
            </tr>
          </thead>
          <tbody>
            <Section label="Unrestricted funds" rows={unrestricted} />
            <Section label="Restricted funds" rows={restricted} />
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td className="border-t-2 border-black py-2">Total funds</td>
              <td className="tnum border-t-2 border-black py-2 text-right">{formatZAR(t.opening)}</td>
              <td className="tnum border-t-2 border-black py-2 text-right">{formatZAR(t.income)}</td>
              <td className="tnum border-t-2 border-black py-2 text-right">{formatZAR(t.expense)}</td>
              <td className="tnum border-t-2 border-black py-2 text-right">{formatZAR(t.transfers)}</td>
              <td className="tnum border-t-2 border-black py-2 text-right">{formatZAR(t.closing)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-6 text-[10px] leading-relaxed text-neutral-500">
          Restricted funds carry a donor-imposed purpose and may only be spent
          on that purpose. A restricted balance is not available for general
          operating expenditure.
        </p>
      </PrintSheet>
    </>
  );
}

function Section({
  label,
  rows,
}: {
  label: string;
  rows: {
    id: string; code: string; name: string;
    opening: number; income: number; expense: number;
    transfers: number; closing: number;
  }[];
}) {
  if (rows.length === 0) return null;
  const sub = rows.reduce(
    (a, f) => ({
      opening: a.opening + f.opening, income: a.income + f.income,
      expense: a.expense + f.expense, transfers: a.transfers + f.transfers,
      closing: a.closing + f.closing,
    }),
    { opening: 0, income: 0, expense: 0, transfers: 0, closing: 0 },
  );
  return (
    <>
      <tr>
        <td colSpan={6} className="pt-4 pb-1 font-semibold tracking-wide uppercase">{label}</td>
      </tr>
      {rows.map((f) => (
        <tr key={f.id}>
          <td className="py-1.5">
            {f.name} <span className="tnum text-neutral-500">({f.code})</span>
          </td>
          <td className="tnum py-1.5 text-right">{formatZAR(f.opening)}</td>
          <td className="tnum py-1.5 text-right">{formatZAR(f.income)}</td>
          <td className="tnum py-1.5 text-right">{formatZAR(f.expense)}</td>
          <td className="tnum py-1.5 text-right">{f.transfers === 0 ? "—" : formatZAR(f.transfers)}</td>
          <td className="tnum py-1.5 text-right font-medium">{formatZAR(f.closing)}</td>
        </tr>
      ))}
      <tr className="font-semibold">
        <td className="border-t py-1.5">Subtotal</td>
        <td className="tnum border-t py-1.5 text-right">{formatZAR(sub.opening)}</td>
        <td className="tnum border-t py-1.5 text-right">{formatZAR(sub.income)}</td>
        <td className="tnum border-t py-1.5 text-right">{formatZAR(sub.expense)}</td>
        <td className="tnum border-t py-1.5 text-right">{formatZAR(sub.transfers)}</td>
        <td className="tnum border-t py-1.5 text-right">{formatZAR(sub.closing)}</td>
      </tr>
    </>
  );
}
