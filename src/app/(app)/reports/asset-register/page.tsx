import { Fragment } from "react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { depreciation } from "@/lib/finance";
import { today } from "@/lib/demo";
import { formatDate, formatZAR, enumLabel } from "@/lib/format";
import { PrintBar, PrintSheet } from "@/components/print-sheet";
import type { AssetCategory } from "@/generated/prisma";

export default async function AssetRegisterReport() {
  const asAt = today();
  const [assets, session] = await Promise.all([
    db.asset.findMany({
      where: { deletedAt: null, status: { notIn: ["DISPOSED", "WRITTEN_OFF"] } },
      orderBy: [{ category: "asc" }, { assetCode: "asc" }],
    }),
    getSession(),
  ]);

  const byCategory = new Map<AssetCategory, typeof assets>();
  for (const a of assets) {
    byCategory.set(a.category, [...(byCategory.get(a.category) ?? []), a]);
  }

  const grand = assets.reduce(
    (t, a) => {
      const d = depreciation(a, asAt);
      return {
        cost: t.cost + a.acquisitionCost,
        accumulated: t.accumulated + d.accumulated,
        nbv: t.nbv + d.netBookValue,
      };
    },
    { cost: 0, accumulated: 0, nbv: 0 },
  );

  return (
    <>
      <PrintBar backHref="/assets" label="Print register" />
      <PrintSheet
        title="Fixed Asset Register"
        period={`As at ${formatDate(asAt)}`}
        generatedBy={session?.name}
        landscape
      >
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="w-20 border-b border-black py-1 text-left font-semibold">Code</th>
              <th className="border-b border-black py-1 text-left font-semibold">Description</th>
              <th className="w-28 border-b border-black py-1 text-left font-semibold">Location</th>
              <th className="w-20 border-b border-black py-1 text-left font-semibold">Acquired</th>
              <th className="w-24 border-b border-black py-1 text-right font-semibold">Cost</th>
              <th className="w-16 border-b border-black py-1 text-right font-semibold">Life</th>
              <th className="w-24 border-b border-black py-1 text-right font-semibold">Acc. dep.</th>
              <th className="w-24 border-b border-black py-1 text-right font-semibold">Book value</th>
            </tr>
          </thead>
          <tbody>
            {[...byCategory.entries()].map(([category, items]) => {
              const sub = items.reduce(
                (t, a) => {
                  const d = depreciation(a, asAt);
                  return {
                    cost: t.cost + a.acquisitionCost,
                    accumulated: t.accumulated + d.accumulated,
                    nbv: t.nbv + d.netBookValue,
                  };
                },
                { cost: 0, accumulated: 0, nbv: 0 },
              );

              return (
                <Fragment key={category}>
                  <tr>
                    <td colSpan={8} className="pt-3 pb-1 font-semibold tracking-wide uppercase">
                      {enumLabel(category)}
                    </td>
                  </tr>
                  {items.map((a) => {
                    const d = depreciation(a, asAt);
                    return (
                      <tr key={a.id}>
                        <td className="tnum py-1">{a.assetCode}</td>
                        <td className="py-1">{a.description}</td>
                        <td className="py-1">{a.location ?? "—"}</td>
                        <td className="tnum py-1">{formatDate(a.acquisitionDate)}</td>
                        <td className="tnum py-1 text-right">
                          {formatZAR(a.acquisitionCost, { decimals: false })}
                        </td>
                        <td className="tnum py-1 text-right">{a.usefulLifeYears} yr</td>
                        <td className="tnum py-1 text-right">
                          {formatZAR(d.accumulated, { decimals: false })}
                        </td>
                        <td className="tnum py-1 text-right font-medium">
                          {formatZAR(d.netBookValue, { decimals: false })}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="font-semibold">
                    <td colSpan={4} className="border-t py-1">Subtotal</td>
                    <td className="tnum border-t py-1 text-right">
                      {formatZAR(sub.cost, { decimals: false })}
                    </td>
                    <td className="border-t" />
                    <td className="tnum border-t py-1 text-right">
                      {formatZAR(sub.accumulated, { decimals: false })}
                    </td>
                    <td className="tnum border-t py-1 text-right">
                      {formatZAR(sub.nbv, { decimals: false })}
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td colSpan={4} className="border-t-2 border-black py-1.5">Total</td>
              <td className="tnum border-t-2 border-black py-1.5 text-right">
                {formatZAR(grand.cost, { decimals: false })}
              </td>
              <td className="border-t-2 border-black" />
              <td className="tnum border-t-2 border-black py-1.5 text-right">
                {formatZAR(grand.accumulated, { decimals: false })}
              </td>
              <td className="tnum border-t-2 border-black py-1.5 text-right">
                {formatZAR(grand.nbv, { decimals: false })}
              </td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-6 text-[9.5px] leading-relaxed text-neutral-500">
          Depreciation is calculated on the straight-line basis over each
          asset&rsquo;s estimated useful life, net of residual value. Disposed
          and written-off assets are excluded from this schedule and are listed
          separately.
        </p>
      </PrintSheet>
    </>
  );
}
