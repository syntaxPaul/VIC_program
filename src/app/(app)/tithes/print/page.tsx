import { getSession } from "@/lib/auth";
import { requireArea } from "@/lib/guards";
import { today } from "@/lib/demo";
import { formatZAR } from "@/lib/format";
import { GIVING_TYPES, givingForMonth, monthOf } from "@/lib/giving";
import { PrintBar, PrintSheet } from "@/components/print-sheet";

export default async function TithesPrint({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requireArea("tithes");
  const session = await getSession();
  const sp = await searchParams;
  const month = monthOf(sp.m, today());
  const g = await givingForMonth(month.start, month.end);

  return (
    <>
      <PrintBar backHref={`/tithes?m=${month.key}`} label="Print" />
      <PrintSheet title="Tithes and offerings" period={month.label} generatedBy={session?.name}>
        <table className="mb-6 w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th className="py-1.5">Kind</th><th className="py-1.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {GIVING_TYPES.map((t) => (
              <tr key={t.key} className="border-b border-neutral-300">
                <td className="py-1.5">{t.label}</td>
                <td className="tnum py-1.5 text-right">{formatZAR(g.totals[t.key])}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-2">Total received</td>
              <td className="tnum py-2 text-right">{formatZAR(g.grandTotal)}</td>
            </tr>
          </tbody>
        </table>

        <p className="mb-2 font-semibold">Who tithed · {g.tithers.length} members</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th className="py-1.5">Member</th><th className="py-1.5">Number</th>
              <th className="py-1.5 text-right">Times</th><th className="py-1.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {g.tithers.map((t) => (
              <tr key={t.id} className="border-b border-neutral-300">
                <td className="py-1.5">{t.name}</td>
                <td className="tnum py-1.5">{t.number}</td>
                <td className="tnum py-1.5 text-right">{t.count}</td>
                <td className="tnum py-1.5 text-right">{formatZAR(t.total)}</td>
              </tr>
            ))}
            {g.anonymousTithes > 0 ? (
              <tr className="border-b border-neutral-300 text-neutral-600">
                <td className="py-1.5" colSpan={3}>Tithes given without a name</td>
                <td className="tnum py-1.5 text-right">{formatZAR(g.anonymousTithes)}</td>
              </tr>
            ) : null}
            <tr className="font-semibold">
              <td className="py-2" colSpan={3}>Total tithes</td>
              <td className="tnum py-2 text-right">{formatZAR(g.totals.TITHE)}</td>
            </tr>
          </tbody>
        </table>
        {g.unposted ? (
          <p className="mt-4 text-[10.5px] text-neutral-600">
            {g.unposted} {g.unposted === 1 ? "entry is" : "entries are"} still waiting to be counted and posted.
          </p>
        ) : null}
      </PrintSheet>
    </>
  );
}
