import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { saveAsset } from "@/lib/actions/assets";
import { enumLabel, formatDateInput } from "@/lib/format";
import { Button, Card, CardHeader, Field, Input, PageHeader, Select } from "@/components/ui";
import { PhotoField } from "@/components/photo-field";
import type { AssetCategory } from "@/generated/prisma";

const CATEGORIES: AssetCategory[] = [
  "LAND_AND_BUILDINGS", "FURNITURE_AND_FITTINGS", "MUSICAL_AND_SOUND",
  "IT_EQUIPMENT", "VEHICLES", "KITCHEN_EQUIPMENT", "BOOKS_AND_MEDIA", "OTHER",
];

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [asset, funds, members] = await Promise.all([
    db.asset.findFirst({ where: { id, deletedAt: null } }),
    db.fund.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.member.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
  ]);

  if (!asset) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={asset.description} description={`Editing ${asset.assetCode}`} />

      <form action={saveAsset.bind(null, id)} className="space-y-4">
        <Card>
          <CardHeader title="Identification" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Description" className="sm:col-span-2">
              <Input name="description" required defaultValue={asset.description} />
            </Field>
            <Field label="Make and model" optional>
              <Input name="makeModel" defaultValue={asset.makeModel ?? ""} />
            </Field>
            <Field label="Serial number" optional>
              <Input name="serialNumber" defaultValue={asset.serialNumber ?? ""} className="tnum" />
            </Field>
            <Field label="Category">
              <Select name="category" defaultValue={asset.category}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{enumLabel(c)}</option>)}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <PhotoField current={asset.photoPath} label="Photo" />
            </div>
            <Field label="Condition">
              <Select name="condition" defaultValue={asset.condition}>
                {["NEW", "GOOD", "FAIR", "POOR", "UNSERVICEABLE"].map((c) => (
                  <option key={c} value={c}>{enumLabel(c)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={asset.status}>
                {["IN_USE", "IN_STORAGE", "UNDER_REPAIR", "ON_LOAN"].map((c) => (
                  <option key={c} value={c}>{enumLabel(c)}</option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Acquisition" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Acquisition date">
              <Input
                name="acquisitionDate"
                type="date"
                required
                defaultValue={formatDateInput(asset.acquisitionDate)}
              />
            </Field>
            <Field label="Cost">
              <Input
                name="acquisitionCost"
                required
                inputMode="decimal"
                defaultValue={asset.acquisitionCost}
                className="tnum"
              />
            </Field>
            <Field label="How acquired">
              <Select name="acquisitionMethod" defaultValue={asset.acquisitionMethod}>
                <option value="PURCHASED">Purchased</option>
                <option value="DONATED">Donated</option>
                <option value="BUILT">Built</option>
              </Select>
            </Field>
            <Field label="Paid from fund" optional>
              <Select name="fundId" defaultValue={asset.fundId ?? ""}>
                <option value="">Not specified</option>
                {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
            </Field>
            <Field label="Supplier" optional>
              <Input name="supplier" defaultValue={asset.supplier ?? ""} />
            </Field>
            <Field label="Invoice reference" optional>
              <Input name="invoiceRef" defaultValue={asset.invoiceRef ?? ""} />
            </Field>
            <Field label="Donor name" optional className="sm:col-span-2">
              <Input name="donorName" defaultValue={asset.donorName ?? ""} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Location, depreciation and insurance" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Location" optional>
              <Input name="location" defaultValue={asset.location ?? ""} />
            </Field>
            <Field label="Custodian" optional>
              <Select name="custodianId" defaultValue={asset.custodianId ?? ""}>
                <option value="">Not assigned</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
              </Select>
            </Field>
            <Field label="Ministry" optional>
              <Input name="ministry" defaultValue={asset.ministry ?? ""} />
            </Field>
            <Field label="Useful life (years)">
              <Input
                name="usefulLifeYears"
                type="number"
                min={1}
                defaultValue={asset.usefulLifeYears}
                className="tnum"
              />
            </Field>
            <Field label="Residual value" optional>
              <Input
                name="residualValue"
                inputMode="decimal"
                defaultValue={asset.residualValue}
                className="tnum"
              />
            </Field>
            <Field label="Insured value" optional>
              <Input
                name="insuredValue"
                inputMode="decimal"
                defaultValue={asset.insuredValue ?? ""}
                className="tnum"
              />
            </Field>
            <Field label="Insurance policy reference" optional>
              <Input name="insurancePolicyRef" defaultValue={asset.insurancePolicyRef ?? ""} />
            </Field>
            <Field label="Warranty expires" optional>
              <Input
                name="warrantyExpiry"
                type="date"
                defaultValue={formatDateInput(asset.warrantyExpiry)}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 border-t px-5 py-3">
            <Link href={`/assets/${id}`}>
              <Button type="button" variant="ghost">Cancel</Button>
            </Link>
            <Button type="submit" variant="primary">Save changes</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
