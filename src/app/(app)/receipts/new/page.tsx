import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { db } from "@/lib/db";
import { issue18aReceipt } from "@/lib/actions/receipts";
import { formatDateInput } from "@/lib/format";
import { today } from "@/lib/demo";
import {
  Button, Card, CardHeader, Field, Input, PageHeader, Select, Textarea,
} from "@/components/ui";

export default async function NewReceiptPage() {
  const settings = await db.settings.findFirst();
  if (!settings?.is18aApproved) redirect("/settings");

  const [funds, members] = await Promise.all([
    db.fund.findMany({
      where: { isActive: true, is18aEligible: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.member.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: {
        id: true, fullName: true, memberNumber: true, idNumber: true,
        taxRefNumber: true, email: true, phone: true,
      },
    }),
  ]);

  if (funds.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Issue Section 18A receipt" />
        <Card className="border-warning/40 bg-warning-bg/60 dark:bg-warning/10">
          <div className="flex items-start gap-3 p-5">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" />
            <div className="text-[13.5px] leading-relaxed">
              <p className="font-medium">No fund is flagged as 18A eligible</p>
              <p className="mt-1 text-[var(--text-muted)]">
                Receipts can only be issued against funds that finance approved
                Part II public benefit activities — typically benevolence,
                feeding schemes or approved outreach. Flag the appropriate fund
                under Funds, and never flag the general tithe fund.
              </p>
              <Link href="/funds" className="mt-3 inline-block">
                <Button>Go to funds</Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Issue Section 18A receipt"
        description="Every field below is prescribed by SARS. A receipt missing them is not valid."
      />

      <form action={issue18aReceipt} className="space-y-4">
        <Card>
          <CardHeader title="Donor" subtitle="Identification is prescribed and must be complete" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Existing member" optional className="sm:col-span-2">
              <Select name="memberId" defaultValue="">
                <option value="">Not a member</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.memberNumber})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Donor name">
              <Input name="donorName" required />
            </Field>
            <Field label="Nature of donor">
              <Select name="donorNature" defaultValue="NATURAL_PERSON">
                <option value="NATURAL_PERSON">Natural person</option>
                <option value="COMPANY">Company</option>
                <option value="TRUST">Trust</option>
                <option value="OTHER">Other</option>
              </Select>
            </Field>
            <Field label="Identification type">
              <Select name="donorIdType" defaultValue="ID">
                <option value="ID">SA ID number</option>
                <option value="Passport">Passport</option>
                <option value="Registration">Company/trust registration</option>
              </Select>
            </Field>
            <Field label="Country of issue">
              <Input name="donorIdCountry" defaultValue="South Africa" />
            </Field>
            <Field label="Identification number">
              <Input name="donorIdNumber" required className="tnum" />
            </Field>
            <Field label="Income tax reference" hint="Required by SARS from 1 March 2026">
              <Input name="donorTaxRef" required className="tnum" />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Textarea name="donorAddress" rows={2} required />
            </Field>
            <Field label="Telephone">
              <Input name="donorPhone" type="tel" required />
            </Field>
            <Field label="Email">
              <Input name="donorEmail" type="email" required />
            </Field>
            <Field label="Trading name" hint="If different from the donor name" optional className="sm:col-span-2">
              <Input name="donorTradingName" />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Donation" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Date of receipt">
              <Input
                name="donationDate"
                type="date"
                required
                defaultValue={formatDateInput(today())}
              />
            </Field>
            <Field label="Fund" hint="Only 18A-eligible funds appear here">
              <Select name="fundId" required defaultValue={funds[0]?.id}>
                {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
            </Field>
            <Field label="Amount" hint="Cash donations" optional>
              <Input name="amount" inputMode="decimal" placeholder="0,00" className="tnum" />
            </Field>

            <div className="sm:col-span-2">
              <label className="flex items-start gap-2.5 rounded-lg border p-3">
                <input
                  type="checkbox"
                  name="isInKind"
                  className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
                />
                <span>
                  <span className="block text-[13.5px] font-medium">Donation in kind</span>
                  <span className="block text-[12.5px] text-[var(--text-muted)]">
                    Property rather than cash. A description and fair market
                    value are prescribed from 1 March 2026.
                  </span>
                </span>
              </label>
            </div>

            <Field label="Description of property" optional className="sm:col-span-2">
              <Textarea name="inKindDescription" rows={2} placeholder="e.g. 40 food parcels" />
            </Field>
            <Field label="Fair market value" optional>
              <Input name="inKindFairValue" inputMode="decimal" placeholder="0,00" className="tnum" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 border-t px-5 py-3">
            <Link href="/receipts"><Button type="button" variant="ghost">Cancel</Button></Link>
            <Button type="submit" variant="primary">Issue receipt</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
