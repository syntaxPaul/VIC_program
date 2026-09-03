import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate, formatZAR, enumLabel } from "@/lib/format";
import { PrintBar, PrintSheet } from "@/components/print-sheet";

export default async function StocktakeCountSheet({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [round, assets] = await Promise.all([
    db.stocktake.findUnique({ where: { id } }),
    db.asset.findMany({
      where: { deletedAt: null, status: { notIn: ["DISPOSED", "WRITTEN_OFF"] } },
      include: { custodian: true },
      orderBy: [{ location: "asc" }, { assetCode: "asc" }],
    }),
  ]);

  if (!round) notFound();

  // one section per location, so each verifier gets their own sheet
  const byLocation = new Map<string, typeof assets>();
  for (const a of assets) {
    const k = a.location ?? "Unassigned";
    byLocation.set(k, [...(byLocation.get(k) ?? []), a]);
  }

  return (
    <>
      <PrintBar backHref={`/stocktake/${round.id}`} label="Print count sheets" />
      <PrintSheet
        title="Stocktake Count Sheet"
        period={`${round.name} · Cutoff ${formatDate(round.cutoffDate)}`}
        subtitle={round.scopeNote ?? undefined}
        landscape
      >
        {[...byLocation.entries()].map(([location, items]) => (
          <section key={location} className="mb-8 break-inside-avoid">
            <h3 className="mb-2 border-b border-black pb-1 text-[12px] font-semibold">
              {location}
              <span className="ml-2 font-normal text-neutral-500">
                ({items.length} {items.length === 1 ? "asset" : "assets"})
              </span>
            </h3>
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className="w-20 border border-neutral-400 px-1.5 py-1 text-left">Code</th>
                  <th className="border border-neutral-400 px-1.5 py-1 text-left">Description</th>
                  <th className="w-28 border border-neutral-400 px-1.5 py-1 text-left">Serial</th>
                  <th className="w-24 border border-neutral-400 px-1.5 py-1 text-left">Last condition</th>
                  <th className="w-14 border border-neutral-400 px-1.5 py-1 text-center">Found</th>
                  <th className="w-24 border border-neutral-400 px-1.5 py-1 text-center">Condition</th>
                  <th className="w-40 border border-neutral-400 px-1.5 py-1 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id}>
                    <td className="tnum border border-neutral-400 px-1.5 py-1.5">{a.assetCode}</td>
                    <td className="border border-neutral-400 px-1.5 py-1.5">{a.description}</td>
                    <td className="tnum border border-neutral-400 px-1.5 py-1.5">
                      {a.serialNumber ?? "—"}
                    </td>
                    <td className="border border-neutral-400 px-1.5 py-1.5">
                      {enumLabel(a.condition)}
                    </td>
                    <td className="border border-neutral-400 px-1.5 py-1.5 text-center">☐</td>
                    <td className="border border-neutral-400 px-1.5 py-1.5" />
                    <td className="border border-neutral-400 px-1.5 py-1.5" />
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex gap-10">
              <div className="flex-1">
                <div className="mb-1 h-7 border-b border-neutral-700" />
                <p className="text-[9px] tracking-wide text-neutral-600 uppercase">
                  Verified by
                </p>
              </div>
              <div className="flex-1">
                <div className="mb-1 h-7 border-b border-neutral-700" />
                <p className="text-[9px] tracking-wide text-neutral-600 uppercase">Date</p>
              </div>
            </div>
          </section>
        ))}

        <p className="mt-4 text-[9.5px] leading-relaxed text-neutral-500">
          Confirm each asset by tag or serial number. An asset in the register
          but not found is a ghost asset and must be investigated before any
          write-off. An asset found on site but not listed should be recorded as
          unrecorded and assessed for capitalisation.
        </p>
      </PrintSheet>
    </>
  );
}
