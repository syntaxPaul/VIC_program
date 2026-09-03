import { getSession } from "@/lib/auth";
import { financialYearBounds, incomeExpenseStatement } from "@/lib/finance";
import { today } from "@/lib/demo";
import { formatDate, formatZAR } from "@/lib/format";
import { PrintBar, PrintSheet } from "@/components/print-sheet";

export default async function IncomeExpenditureReport({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const fy = financialYearBounds(today(), 3);
  const start = sp.from ? new Date(sp.from) : fy.start;
  const end = sp.to ? new Date(`${sp.to}T23:59:59`) : today();

  const session = await getSession();
  const st = await incomeExpenseStatement({ start, end });

  return (
    <>
      <PrintBar backHref="/reports" />
      <PrintSheet
        title="Income & Expenditure Statement"
        period={`${formatDate(start)} to ${formatDate(end)}`}
        generatedBy={session?.name}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-20 border-b border-black py-1.5 text-left font-semibold">Code</th>
              <th className="border-b border-black py-1.5 text-left font-semibold">Account</th>
              <th className="w-36 border-b border-black py-1.5 text-right font-semibold">Amount</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td colSpan={3} className="pt-4 pb-1 font-semibold tracking-wide uppercase">
                Income
              </td>
            </tr>
            {st.income.length === 0 ? (
              <tr><td colSpan={3} className="py-1.5 text-neutral-500 italic">No income recorded</td></tr>
            ) : (
              st.income.map((a) => (
                <tr key={a.code}>
                  <td className="tnum py-1.5 align-top text-neutral-600">{a.code}</td>
                  <td className="py-1.5">{a.name}</td>
                  <td className="tnum py-1.5 text-right">{formatZAR(a.total)}</td>
                </tr>
              ))
            )}
            <tr className="font-semibold">
              <td colSpan={2} className="border-t py-1.5">Total income</td>
              <td className="tnum border-t py-1.5 text-right">{formatZAR(st.totalIncome)}</td>
            </tr>

            <tr>
              <td colSpan={3} className="pt-5 pb-1 font-semibold tracking-wide uppercase">
                Expenditure
              </td>
            </tr>
            {st.expenses.length === 0 ? (
              <tr><td colSpan={3} className="py-1.5 text-neutral-500 italic">No expenditure recorded</td></tr>
            ) : (
              st.expenses.map((a) => (
                <tr key={a.code}>
                  <td className="tnum py-1.5 align-top text-neutral-600">{a.code}</td>
                  <td className="py-1.5">{a.name}</td>
                  <td className="tnum py-1.5 text-right">{formatZAR(a.total)}</td>
                </tr>
              ))
            )}
            <tr className="font-semibold">
              <td colSpan={2} className="border-t py-1.5">Total expenditure</td>
              <td className="tnum border-t py-1.5 text-right">{formatZAR(st.totalExpense)}</td>
            </tr>
          </tbody>

          <tfoot>
            <tr className="text-[13px] font-bold">
              <td colSpan={2} className="border-t-2 border-black py-2.5">
                {st.surplus >= 0 ? "Surplus for the period" : "Deficit for the period"}
              </td>
              <td className="tnum border-t-2 border-black py-2.5 text-right">
                {formatZAR(st.surplus, { parens: true })}
              </td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-6 text-[10px] leading-relaxed text-neutral-500">
          Prepared on a cash receipts and payments basis from the church&rsquo;s
          accounting records. Figures are stated in South African rand.
        </p>
      </PrintSheet>
    </>
  );
}
