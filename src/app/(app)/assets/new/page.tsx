import Link from "next/link";
import { db } from "@/lib/db";
import { saveAsset } from "@/lib/actions/assets";
import { enumLabel } from "@/lib/format";
import { Button, Card, CardHeader, Field, Input, PageHeader, Select } from "@/components/ui";
import { PhotoField } from "@/components/photo-field";
import type { AssetCategory } from "@/generated/prisma";

const CATEGORIES: AssetCategory[] = [
  "LAND_AND_BUILDINGS", "FURNITURE_AND_FITTINGS", "MUSICAL_AND_SOUND",
  "IT_EQUIPMENT", "VEHICLES", "KITCHEN_EQUIPMENT", "BOOKS_AND_MEDIA", "OTHER",
];

/** Default useful lives, editable per asset. */
const DEFAULT_LIFE: Record<AssetCategory, number> = {
  LAND_AND_BUILDINGS: 40, FURNITURE_AND_FITTINGS: 10, MUSICAL_AND_SOUND: 8,
  IT_EQUIPMENT: 5, VEHICLES: 12, KITCHEN_EQUIPMENT: 10,
  BOOKS_AND_MEDIA: 8, OTHER: 7,
};

export default async function NewAssetPage() {
  const [funds, members, settings] = await Promise.all([
    db.fund.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.member.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
    db.settings.findFirst(),
  ]);

  const action = saveAsset.bind(null, null);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Add asset"
        description={`Items costing more than ${settings ? `R ${settings.capitalisationThreshold.toFixed(0)}` : "the capitalisation threshold"} and lasting over a year belong on the register.`}
      />

      <form action={action} className="space-y-4">
        <Card>
          <CardHeader title="Identification" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Description" className="sm:col-span-2">
              <Input name="description" required placeholder="e.g. Yamaha Stage Piano P-125" />
            </Field>
            <Field label="Make and model" optional>
              <Input name="makeModel" />
            </Field>
            <Field label="Serial number" optional>
              <Input name="serialNumber" className="tnum" />
            </Field>
            <Field label="Category">
              <Select name="category" required defaultValue="OTHER">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {enumLabel(c)} — {DEFAULT_LIFE[c]} yr default life
                  </option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <PhotoField label="Photo" />
            </div>
            <Field label="Condition">
              <Select name="condition" defaultValue="GOOD">
                {["NEW", "GOOD", "FAIR", "POOR", "UNSERVICEABLE"].map((c) => (
                  <option key={c} value={c}>{enumLabel(c)}</option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Acquisition" subtitle="What it cost and where it came from" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Acquisition date">
              <Input name="acquisitionDate" type="date" required />
            </Field>
            <Field label="Cost" hint="Fair value at the date of gift, if donated">
              <Input name="acquisitionCost" required inputMode="decimal" placeholder="0,00" className="tnum" />
            </Field>
            <Field label="How acquired">
              <Select name="acquisitionMethod" defaultValue="PURCHASED">
                <option value="PURCHASED">Purchased</option>
                <option value="DONATED">Donated</option>
                <option value="BUILT">Built</option>
              </Select>
            </Field>
            <Field label="Paid from fund" optional>
              <Select name="fundId" defaultValue="">
                <option value="">Not specified</option>
                {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
            </Field>
            <Field label="Supplier" optional>
              <Input name="supplier" />
            </Field>
            <Field label="Invoice reference" optional>
              <Input name="invoiceRef" />
            </Field>
            <Field label="Donor name" hint="For donated items" optional className="sm:col-span-2">
              <Input name="donorName" />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Location and custody" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Location" optional>
              <Input name="location" placeholder="e.g. Main Sanctuary" />
            </Field>
            <Field label="Custodian" hint="Who is responsible for it" optional>
              <Select name="custodianId" defaultValue="">
                <option value="">Not assigned</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
              </Select>
            </Field>
            <Field label="Ministry" optional className="sm:col-span-2">
              <Input name="ministry" placeholder="e.g. Worship" />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Depreciation and insurance" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Useful life (years)">
              <Input name="usefulLifeYears" type="number" min={1} defaultValue={7} className="tnum" />
            </Field>
            <Field label="Residual value" optional>
              <Input name="residualValue" inputMode="decimal" placeholder="0,00" className="tnum" />
            </Field>
            <Field label="Insured value" optional>
              <Input name="insuredValue" inputMode="decimal" placeholder="0,00" className="tnum" />
            </Field>
            <Field label="Insurance policy reference" optional>
              <Input name="insurancePolicyRef" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 border-t px-5 py-3">
            <Link href="/assets"><Button type="button" variant="ghost">Cancel</Button></Link>
            <Button type="submit" variant="primary">Add to register</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
