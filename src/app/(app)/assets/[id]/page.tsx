import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Package, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { depreciation } from "@/lib/finance";
import { today } from "@/lib/demo";
import { formatDate, formatZAR, enumLabel } from "@/lib/format";
import { writeOffAsset } from "@/lib/actions/assets";
import {
  Badge, Button, Card, CardHeader, Field, Input, PageHeader, Select, Textarea,
} from "@/components/ui";

export default async function AssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const asset = await db.asset.findFirst({
    where: { id, deletedAt: null },
    include: {
      custodian: true,
      fund: true,
      verifications: {
        include: { stocktake: true, verifiedBy: true },
        orderBy: { verifiedAt: "desc" },
      },
    },
  });

  if (!asset) notFound();

  const asAt = today();
  const d = depreciation(asset, asAt);
  const disposed = asset.status === "DISPOSED" || asset.status === "WRITTEN_OFF";
  const writeOff = writeOffAsset.bind(null, asset.id);

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title={asset.description}
        description={`${asset.assetCode} · ${enumLabel(asset.category)}`}
        actions={
          <Link href={`/assets/${asset.id}/edit`}>
            <Button>Edit</Button>
          </Link>
        }
      />

      {disposed ? (
        <Card className="mb-4 border-warning/40 bg-warning-bg/60 dark:bg-warning/10">
          <div className="flex items-start gap-3 p-4">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" />
            <div className="text-[13.5px]">
              <p className="font-medium">
                {asset.status === "WRITTEN_OFF" ? "Written off" : "Disposed"} on{" "}
                {formatDate(asset.disposalDate)} · {enumLabel(asset.disposalMethod)}
              </p>
              <p className="mt-0.5 text-[var(--text-muted)]">
                Approved under {asset.approvalReference ?? "—"}
                {asset.approvedBy ? ` by ${asset.approvedBy}` : ""}
                {asset.disposalProceeds
                  ? ` · Proceeds ${formatZAR(asset.disposalProceeds)}`
                  : ""}
              </p>
              {asset.disposalNotes ? (
                <p className="mt-1 text-[var(--text-muted)]">{asset.disposalNotes}</p>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Details" />
            {asset.photoPath ? (
              <div className="border-b p-5 pb-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/photo/${asset.photoPath}`}
                  alt={asset.description}
                  className="mb-5 max-h-64 w-full rounded-lg border object-cover"
                />
              </div>
            ) : null}
            <div className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-3">
              <LV label="Make and model" value={asset.makeModel ?? "—"} />
              <LV label="Serial number" value={asset.serialNumber ?? "—"} mono />
              <LV label="Condition" value={enumLabel(asset.condition)} />
              <LV label="Location" value={asset.location ?? "—"} />
              <LV label="Custodian" value={asset.custodian?.fullName ?? "Not assigned"} />
              <LV label="Ministry" value={asset.ministry ?? "—"} />
              <LV label="Acquired" value={formatDate(asset.acquisitionDate)} />
              <LV label="How acquired" value={enumLabel(asset.acquisitionMethod)} />
              <LV label="Paid from" value={asset.fund?.name ?? "—"} />
              <LV label="Supplier" value={asset.supplier ?? "—"} />
              <LV label="Invoice" value={asset.invoiceRef ?? "—"} mono />
              <LV label="Donor" value={asset.donorName ?? "—"} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Verification history" subtitle="Physical checks at each stocktake" />
            {asset.verifications.length === 0 ? (
              <p className="px-5 py-10 text-center text-[13px] text-[var(--text-muted)]">
                This asset has never been physically verified.
              </p>
            ) : (
              <ul className="divide-y">
                {asset.verifications.map((v) => (
                  <li key={v.id} className="flex items-center gap-3 px-5 py-3">
                    <ShieldCheck
                      size={16}
                      className={v.outcome === "FOUND" ? "text-success" : "text-warning"}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-medium">{v.stocktake.name}</p>
                      <p className="text-[12px] text-[var(--text-muted)]">
                        {formatDate(v.verifiedAt)}
                        {v.verifiedBy ? ` · ${v.verifiedBy.name}` : ""}
                        {v.notes ? ` · ${v.notes}` : ""}
                      </p>
                    </div>
                    <Badge tone={v.outcome === "FOUND" ? "success" : "warning"}>
                      {enumLabel(v.outcome)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {!disposed ? (
            <Card>
              <CardHeader
                title="Write off or dispose"
                subtitle="Requires a church council resolution reference — the record is kept, never deleted"
              />
              <form action={writeOff}>
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <Field label="Date">
                    <Input name="disposalDate" type="date" required />
                  </Field>
                  <Field label="Method">
                    <Select name="disposalMethod" defaultValue="SCRAPPED">
                      <option value="SCRAPPED">Scrapped</option>
                      <option value="SOLD">Sold</option>
                      <option value="DONATED">Donated</option>
                      <option value="STOLEN">Stolen</option>
                      <option value="DESTROYED">Destroyed</option>
                    </Select>
                  </Field>
                  <Field label="Council resolution / minute" hint="Required">
                    <Input name="approvalReference" required placeholder="e.g. Council Minute 2026/07" />
                  </Field>
                  <Field label="Approved by" optional>
                    <Input name="approvedBy" placeholder="e.g. Church Council" />
                  </Field>
                  <Field label="Proceeds" hint="If sold" optional>
                    <Input name="disposalProceeds" inputMode="decimal" placeholder="0,00" className="tnum" />
                  </Field>
                  <Field label="Notes" optional className="sm:col-span-2">
                    <Textarea name="disposalNotes" rows={2} />
                  </Field>
                </div>
                <div className="flex justify-end border-t px-5 py-3">
                  <Button type="submit" variant="danger">Write off asset</Button>
                </div>
              </form>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Valuation" subtitle={`Straight line, as at ${formatDate(asAt)}`} />
            <div className="space-y-3 p-5">
              <Row label="Cost" value={formatZAR(asset.acquisitionCost)} />
              <Row label="Residual value" value={formatZAR(asset.residualValue)} />
              <Row label="Useful life" value={`${asset.usefulLifeYears} years`} />
              <Row label="Annual depreciation" value={formatZAR(d.annual)} />
              <Row label="Accumulated" value={formatZAR(d.accumulated)} />
              <div className="border-t pt-3">
                <Row label="Net book value" value={formatZAR(d.netBookValue)} strong />
              </div>

              <div className="pt-1">
                <div className="mb-1.5 flex justify-between text-[11.5px] text-[var(--text-muted)]">
                  <span>Depreciated</span>
                  <span className="tnum">
                    {asset.acquisitionCost
                      ? Math.round((d.accumulated / (asset.acquisitionCost - asset.residualValue || 1)) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-sand-200 dark:bg-sand-800">
                  <div
                    className="h-full rounded-full bg-bronze-500"
                    style={{
                      width: `${Math.min(100, (d.accumulated / (asset.acquisitionCost - asset.residualValue || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Insurance" />
            <div className="space-y-3 p-5">
              <Row
                label="Insured value"
                value={asset.insuredValue ? formatZAR(asset.insuredValue) : "Not insured"}
              />
              <Row label="Policy reference" value={asset.insurancePolicyRef ?? "—"} />
              <Row
                label="Warranty expires"
                value={asset.warrantyExpiry ? formatDate(asset.warrantyExpiry) : "—"}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Status" />
            <div className="space-y-3 p-5">
              <Row label="Status" value={enumLabel(asset.status)} />
              <Row
                label="Last verified"
                value={asset.lastVerifiedAt ? formatDate(asset.lastVerifiedAt) : "Never"}
              />
              <Row label="Verified by" value={asset.lastVerifiedBy ?? "—"} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11.5px] tracking-wide text-[var(--text-muted)] uppercase">{label}</p>
      <p className={`mt-0.5 text-[13.5px] ${mono ? "tnum" : ""}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className={`tnum ${strong ? "text-[15px] font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
