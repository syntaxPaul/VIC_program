import { getSession } from "@/lib/auth";
import { financialYearBounds, monthlyComparison } from "@/lib/finance";
import { today } from "@/lib/demo";
import { formatDate, formatZAR } from "@/lib/format";
import { PrintBar, PrintSheet } from "@/components/print-sheet";
import type { AccountType } from "@/generated/prisma";

export default async function MonthlyComparisonReport({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const sp = await searchParams;
  const type = (sp.type === "INCOME" ? "INCOME" : "EXPENSE") as AccountType;
  const fy = financialYearBounds(today(), 3);
  const session = await getSession();
  const data = await monthlyComparison({ start: fy.start, end: fy.end }, type);

  return (
    <>
      <PrintBar backHref="/reports" />
      <div className="no-print mx-auto mb-3 flex max-w-[1120px] gap-2 px-2">
        <a
          href="?type=EXPENSE"
          className={`rounded-lg border px-3 py-1.5 text-[13px] ${type === "EXPENSE" ? "border-bronze-500 bg-bronze-50 font-medium text-bronze-700 dark:bg-bronze-600/20 dark:text-bronze-300" : ""}`}
        >
          Expenditure
        </a>
        <a
          href="?type=INCOME"
          className={`rounded-lg border px-3 py-1.5 text-[13px] ${type === "INCOME" ? "border-bronze-500 bg-bronze-50 font-medium text-bronze-700 dark:bg-bronze-600/20 dark:text-bronze-300" : ""}`}
        >
          Income
        </a>
      </div>

      <PrintSheet
        title={`Monthly Comparison — ${type === "INCOME" ? "Income" : "Expenditure"}`}
        period={`Financial year ${fy.label} · ${formatDate(fy.start)} to ${formatDate(fy.end)}`}
        generatedBy={session?.name}
        landscape
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr>
                <th className="border-b border-black py-1.5 pr-2 text-left font-semibold">Account</th>
                {data.months.map((m) => (
                  <th key={m.key} className="border-b border-black px-1 py-1.5 text-right font-semibold">
                    {m.label}
                  </th>
                ))}
                <th className="border-b border-black py-1.5 pl-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.accounts.length === 0 ? (
                <tr>
                  <td colSpan={data.months.length + 2} className="py-3 text-neutral-500 italic">
                    Nothing recorded for this financial year.
                  </td>
                </tr>
              ) : (
                data.accounts.map((a) => (
                  <tr key={a.code}>
                    <td className="py-1 pr-2 whitespace-nowrap">
                      <span className="tnum text-neutral-500">{a.code}</span> {a.name}
                    </td>
                    {data.months.map((m) => (
                      <td key={m.key} className="tnum px-1 py-1 text-right">
                        {a.months[m.key] ? formatZAR(a.months[m.key], { decimals: false, symbol: false }) : "—"}
                      </td>
                    ))}
                    <td className="tnum py-1 pl-2 text-right font-medium">
                      {formatZAR(a.total, { decimals: false, symbol: false })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className="border-t-2 border-black py-1.5 pr-2">Total</td>
                {data.monthTotals.map((t, i) => (
                  <td key={i} className="tnum border-t-2 border-black px-1 py-1.5 text-right">
                    {t ? formatZAR(t, { decimals: false, symbol: false }) : "—"}
                  </td>
                ))}
                <td className="tnum border-t-2 border-black py-1.5 pl-2 text-right">
                  {formatZAR(data.grandTotal, { decimals: false, symbol: false })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-4 text-[10px] text-neutral-500">
          All amounts in South African rand, rounded to the nearest rand.
        </p>
      </PrintSheet>
    </>
  );
}
