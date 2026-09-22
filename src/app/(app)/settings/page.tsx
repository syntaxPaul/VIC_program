import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { saveSettings } from "@/lib/actions/admin";
import { Button, Card, CardHeader, Field, Input, PageHeader, Select } from "@/components/ui";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await getSession();
  if (session?.role !== "ADMIN") redirect("/");

  const sp = await searchParams;
  const s = await db.settings.findFirst();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Settings"
        description="Church details, compliance status and accounting conventions."
      />

      {sp.saved ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success-bg px-3 py-2.5 text-[13px] text-success">
          <Check size={15} /> Settings saved.
        </div>
      ) : null}

      <form action={saveSettings} className="space-y-4">
        <Card>
          <CardHeader title="Church details" subtitle="Printed on every report and certificate" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Church name">
              <Input name="churchName" required defaultValue={s?.churchName ?? ""} />
            </Field>
            <Field label="Street address" optional className="sm:col-span-2">
              <Input name="addressLine1" defaultValue={s?.addressLine1 ?? ""} />
            </Field>
            <Field label="City" optional>
              <Input name="city" defaultValue={s?.city ?? ""} />
            </Field>
            <Field label="Province" optional>
              <Input name="province" defaultValue={s?.province ?? ""} />
            </Field>
            <Field label="Postal code" optional>
              <Input name="postalCode" defaultValue={s?.postalCode ?? ""} className="tnum" />
            </Field>
            <Field label="Phone" optional>
              <Input name="phone" defaultValue={s?.phone ?? ""} />
            </Field>
            <Field label="Email" optional className="sm:col-span-2">
              <Input name="email" type="email" defaultValue={s?.email ?? ""} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Registration and compliance"
            subtitle="Only tick what the church has actually been granted — these change what the system will let you issue"
          />
          <div className="space-y-4 p-5">
            <Toggle
              name="isNpoRegistered"
              label="Registered NPO"
              blurb="Registered with the Department of Social Development under the NPO Act. Annual financial statements are due within 6 months of year end, and the full report within 9 months."
              checked={s?.isNpoRegistered}
              numberName="npoNumber"
              numberLabel="NPO number"
              numberValue={s?.npoNumber}
            />
            <Toggle
              name="isPboApproved"
              label="Approved PBO"
              blurb="Approved by the SARS Tax Exemption Unit under section 30 of the Income Tax Act. An IT12EI return is still required annually."
              checked={s?.isPboApproved}
              numberName="pboNumber"
              numberLabel="PBO number"
              numberValue={s?.pboNumber}
            />
            <Toggle
              name="is18aApproved"
              label="Section 18A approved"
              blurb="A separate approval from PBO status. Ordinary tithes and offerings to a church are generally NOT 18A deductible — only donations funding approved Part II activities. Enabling this reveals the donor tax fields on member records."
              checked={s?.is18aApproved}
              numberName="section18aNumber"
              numberLabel="Section 18A reference"
              numberValue={s?.section18aNumber}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Accounting conventions" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field
              label="Financial year starts"
              hint="March aligns with the SARS year of assessment"
            >
              <Select
                name="financialYearStartMonth"
                defaultValue={String(s?.financialYearStartMonth ?? 3)}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </Select>
            </Field>
            <Field
              label="Capitalisation threshold"
              hint="Items above this go on the asset register"
            >
              <Input
                name="capitalisationThreshold"
                inputMode="decimal"
                defaultValue={s?.capitalisationThreshold ?? 2000}
                className="tnum"
              />
            </Field>
            <Field label="Tithe to main ministry (%)">
              <Input
                name="titheOutPercent"
                inputMode="decimal"
                defaultValue={s?.titheOutPercent ?? 10}
                className="tnum"
              />
            </Field>
            <Field label="Main ministry name" optional>
              <Input name="mainMinistryName" defaultValue={s?.mainMinistryName ?? ""} />
            </Field>
          </div>
          <div className="flex justify-end border-t px-5 py-3">
            <Button type="submit" variant="primary">Save settings</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

function Toggle({
  name, label, blurb, checked, numberName, numberLabel, numberValue,
}: {
  name: string;
  label: string;
  blurb: string;
  checked?: boolean;
  numberName: string;
  numberLabel: string;
  numberValue?: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name={name}
          defaultChecked={checked}
          className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
        />
        <span className="min-w-0">
          <span className="block text-[13.5px] font-medium">{label}</span>
          <span className="mt-0.5 block text-[12.5px] leading-relaxed text-[var(--text-muted)]">
            {blurb}
          </span>
        </span>
      </label>
      <div className="mt-3 pl-7">
        <Field label={numberLabel} optional>
          <Input name={numberName} defaultValue={numberValue ?? ""} className="tnum max-w-xs" />
        </Field>
      </div>
    </div>
  );
}
