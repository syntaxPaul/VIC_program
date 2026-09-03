import { getSession } from "@/lib/auth";
import { budgetVsActual, financialYearBounds } from "@/lib/finance";
import { today } from "@/lib/demo";
import { formatDate, formatZAR } from "@/lib/format";
import { PrintBar, PrintSheet } from "@/components/print-sheet";

export default async function BudgetVsActualReport() {
  const fy = financialYearBounds(today(), 3);
  const session = await getSession();
  const data = await budgetVsActual({ start: fy.start, end: today() });

  if (!data) {
    return (
      <>
        <PrintBar backHref="/reports" />
        <PrintSheet title="Budget vs Actual" period={`Financial year ${fy.label}`}>
          <p className="py-8 text-center text-neutral-500 italic">
            No active budget has been set for this financial year.
          </p>
        </PrintSheet>
      </>
    );
  }

  const income = data.lines.filter((l) => l.type === "INCOME");
  const expense = data.lines.filter((l) => l.type === "EXPENSE");

  return (
    <>
      <PrintBar backHref="/reports" />
      <PrintSheet
        title="Budget vs Actual"
        period={`${formatDate(fy.start)} to ${formatDate(today())} · ${data.budget.name}`}
        generatedBy={session?.name}
        landscape
      >
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-16 border-b border-black py-1.5 text-left font-semibold">Code</th>
              <th className="border-b border-black py-1.5 text-left font-semibold">Account</th>
              <th className="w-28 border-b border-black py-1.5 text-right font-semibold">Budget</th>
              <th className="w-28 border-b border-black py-1.5 text-right font-semibold">Actual</th>
              <th className="w-28 border-b border-black py-1.5 text-right font-semibold">Variance</th>
              <th className="w-20 border-b border-black py-1.5 text-right font-semibold">%</th>
            </tr>
          </thead>
          <tbody>
            <Group label="Income" rows={income} />
            <Group label="Expenditure" rows={expense} />
          </tbody>
        </table>
        <p className="mt-6 text-[10px] leading-relaxed text-neutral-500">
          A positive variance is favourable: income ahead of budget, or
          expenditure below budget. Amounts in South African rand.
        </p>
      </PrintSheet>
    </>
  );
}

type Line = {
  code: string; name: string; budget: number;
  actual: number; variance: number; variancePct: number;
};

function Group({ label, rows }: { label: string; rows: Line[] }) {
  if (rows.length === 0) return null;
  const t = rows.reduce(
    (a, l) => ({
      budget: a.budget + l.budget,
      actual: a.actual + l.actual,
      variance: a.variance + l.variance,
    }),
    { budget: 0, actual: 0, variance: 0 },
  );
  return (
    <>
      <tr>
        <td colSpan={6} className="pt-4 pb-1 font-semibold tracking-wide uppercase">{label}</td>
      </tr>
      {rows.map((l) => (
        <tr key={l.code}>
          <td className="tnum py-1.5 text-neutral-600">{l.code}</td>
          <td className="py-1.5">{l.name}</td>
          <td className="tnum py-1.5 text-right">{formatZAR(l.budget, { decimals: false })}</td>
          <td className="tnum py-1.5 text-right">{formatZAR(l.actual, { decimals: false })}</td>
          <td className="tnum py-1.5 text-right">
            {formatZAR(l.variance, { decimals: false, parens: true })}
          </td>
          <td className="tnum py-1.5 text-right">
            {l.budget ? `${l.variance >= 0 ? "+" : "−"}${Math.abs(l.variancePct).toFixed(0)}%` : "—"}
          </td>
        </tr>
      ))}
      <tr className="font-semibold">
        <td colSpan={2} className="border-t py-1.5">Total {label.toLowerCase()}</td>
        <td className="tnum border-t py-1.5 text-right">{formatZAR(t.budget, { decimals: false })}</td>
        <td className="tnum border-t py-1.5 text-right">{formatZAR(t.actual, { decimals: false })}</td>
        <td className="tnum border-t py-1.5 text-right">
          {formatZAR(t.variance, { decimals: false, parens: true })}
        </td>
        <td className="border-t" />
      </tr>
    </>
  );
}
