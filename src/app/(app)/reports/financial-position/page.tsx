import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { financialYearBounds, fundBalances, depreciation } from "@/lib/finance";
import { today } from "@/lib/demo";
import { formatDate, formatZAR } from "@/lib/format";
import { PrintBar, PrintSheet } from "@/components/print-sheet";

export default async function FinancialPositionReport() {
  const fy = financialYearBounds(today(), 3);
  const asAt = today();
  const session = await getSession();

  const [funds, assets] = await Promise.all([
    fundBalances({ start: fy.start, end: asAt }),
    db.asset.findMany({
      where: { deletedAt: null, status: { notIn: ["DISPOSED", "WRITTEN_OFF"] } },
      select: {
        acquisitionCost: true, residualValue: true,
        usefulLifeYears: true, acquisitionDate: true,
      },
    }),
  ]);

  const cost = assets.reduce((s, a) => s + a.acquisitionCost, 0);
  const accumulated = assets.reduce((s, a) => s + depreciation(a, asAt).accumulated, 0);
  const nbv = cost - accumulated;

  const cash = funds.reduce((s, f) => s + f.closing, 0);
  const totalAssets = cash + nbv;

  const unrestricted = funds
    .filter((f) => f.fundClass === "UNRESTRICTED")
    .reduce((s, f) => s + f.closing, 0);
  const tempRestricted = funds
    .filter((f) => f.fundClass === "TEMPORARILY_RESTRICTED")
    .reduce((s, f) => s + f.closing, 0);
  const permRestricted = funds
    .filter((f) => f.fundClass === "PERMANENTLY_RESTRICTED")
    .reduce((s, f) => s + f.closing, 0);

  return (
    <>
      <PrintBar backHref="/reports" />
      <PrintSheet
        title="Statement of Financial Position"
        period={`As at ${formatDate(asAt)}`}
        generatedBy={session?.name}
      >
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td colSpan={2} className="pb-1 font-semibold tracking-wide uppercase">Assets</td>
            </tr>
            <Row label="Cash and fund balances" value={cash} />
            <Row label="Fixed assets at cost" value={cost} />
            <Row label="Less: accumulated depreciation" value={-accumulated} parens />
            <Row label="Fixed assets — net book value" value={nbv} indent />
            <tr className="font-bold">
              <td className="border-t-2 border-black py-2">Total assets</td>
              <td className="tnum border-t-2 border-black py-2 text-right">{formatZAR(totalAssets)}</td>
            </tr>

            <tr>
              <td colSpan={2} className="pt-6 pb-1 font-semibold tracking-wide uppercase">
                Funds
              </td>
            </tr>
            <Row label="Unrestricted funds" value={unrestricted} />
            <Row label="Temporarily restricted funds" value={tempRestricted} />
            {permRestricted !== 0 ? (
              <Row label="Permanently restricted funds" value={permRestricted} />
            ) : null}
            <Row label="Fixed asset fund (net book value)" value={nbv} />
            <tr className="font-bold">
              <td className="border-t-2 border-black py-2">Total funds</td>
              <td className="tnum border-t-2 border-black py-2 text-right">
                {formatZAR(unrestricted + tempRestricted + permRestricted + nbv)}
              </td>
            </tr>
          </tbody>
        </table>

        <p className="mt-6 text-[10px] leading-relaxed text-neutral-500">
          Fixed assets are depreciated on the straight-line basis over their
          estimated useful lives. Restricted funds may only be applied to the
          purpose for which they were given. Amounts in South African rand.
        </p>
      </PrintSheet>
    </>
  );
}

function Row({
  label, value, indent, parens,
}: {
  label: string;
  value: number;
  indent?: boolean;
  parens?: boolean;
}) {
  return (
    <tr>
      <td className={`py-1.5 ${indent ? "pl-5 font-medium" : ""}`}>{label}</td>
      <td className="tnum py-1.5 text-right">{formatZAR(value, { parens })}</td>
    </tr>
  );
}
