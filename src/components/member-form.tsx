"use client";

import * as React from "react";
import Link from "next/link";
import { Save } from "lucide-react";
import { IdNumberField } from "@/components/id-number-field";
import { Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import { formatDateInput } from "@/lib/format";
import { PhotoField } from "./photo-field";

type Option = { id: string; name: string };

export type MemberFormValues = {
  id?: string;
  surname?: string | null;
  fullName?: string | null;
  dob?: Date | null;
  gender?: string | null;
  maritalStatus?: string | null;
  status?: string | null;
  addressLine?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  children?: string | null;
  salvationDate?: Date | null;
  baptismDate?: Date | null;
  previousChurch?: string | null;
  previousChurchLocation?: string | null;
  prayerRequests?: string | null;
  notes?: string | null;
  idNumber?: string | null;
  taxRefNumber?: string | null;
  photoPath?: string | null;
  ministryIds?: string[];
  interestIds?: string[];
};

const SECTIONS = [
  { id: "identity", label: "Identity" },
  { id: "contact", label: "Contact" },
  { id: "church", label: "Church life" },
  { id: "involvement", label: "Involvement" },
  { id: "pastoral", label: "Pastoral" },
];

export function MemberForm({
  action,
  values = {},
  ministries,
  interests,
  show18a,
}: {
  action: (formData: FormData) => void;
  values?: MemberFormValues;
  ministries: Option[];
  interests: Option[];
  show18a: boolean;
}) {
  const [active, setActive] = React.useState("identity");
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <form action={action} onChange={() => setDirty(true)} className="pb-24">
      <div className="flex gap-8">
        {/* section index */}
        <nav className="sticky top-20 hidden h-fit w-40 shrink-0 xl:block">
          <ul className="space-y-0.5 border-l">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={`-ml-px block border-l-2 py-1.5 pl-3 text-[13px] transition-colors ${
                    active === s.id
                      ? "border-bronze-600 font-medium text-bronze-700 dark:border-bronze-300 dark:text-bronze-300"
                      : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1 space-y-4">
          <Card id="identity" className="scroll-mt-20">
            <CardHeader title="Identity" subtitle="Who this member is" />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <PhotoField current={values.photoPath} label="Photo" round />
              </div>
              <Field label="Full name">
                <Input name="fullName" required defaultValue={values.fullName ?? ""} />
              </Field>
              <Field label="Surname">
                <Input name="surname" required defaultValue={values.surname ?? ""} />
              </Field>
              <Field label="ID number" optional className="sm:col-span-2">
                <IdNumberField defaultValue={values.idNumber} />
              </Field>
              <Field label="Date of birth" optional>
                <Input name="dob" type="date" defaultValue={formatDateInput(values.dob)} />
              </Field>
              <Field label="Gender" optional>
                <Select name="gender" defaultValue={values.gender ?? ""}>
                  <option value="">Not specified</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </Select>
              </Field>
              <Field label="Marital status" optional>
                <Select name="maritalStatus" defaultValue={values.maritalStatus ?? ""}>
                  <option value="">Not specified</option>
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED">Married</option>
                  <option value="DIVORCED">Divorced</option>
                  <option value="WIDOWED">Widowed</option>
                </Select>
              </Field>
              <Field label="Membership status">
                <Select name="status" defaultValue={values.status ?? "ACTIVE"}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="TRANSFERRED">Transferred</option>
                  <option value="DECEASED">Deceased</option>
                </Select>
              </Field>
              <Field label="Children" hint="Number, or names" optional className="sm:col-span-2">
                <Input name="children" defaultValue={values.children ?? ""} />
              </Field>
            </div>
          </Card>

          <Card id="contact" className="scroll-mt-20">
            <CardHeader title="Contact" subtitle="How to reach them" />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Phone number" optional>
                <Input name="phone" type="tel" defaultValue={values.phone ?? ""} placeholder="082 123 4567" />
              </Field>
              <Field label="Email" optional>
                <Input name="email" type="email" defaultValue={values.email ?? ""} />
              </Field>
              <Field label="Street address" optional className="sm:col-span-2">
                <Input name="addressLine" defaultValue={values.addressLine ?? ""} />
              </Field>
              <Field label="City / township" optional>
                <Input name="city" defaultValue={values.city ?? ""} />
              </Field>
              <Field label="Province" optional>
                <Select name="province" defaultValue={values.province ?? ""}>
                  <option value="">Not specified</option>
                  {["Eastern Cape","Free State","Gauteng","KwaZulu-Natal","Limpopo","Mpumalanga","Northern Cape","North West","Western Cape"].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Postal code" optional>
                <Input name="postalCode" defaultValue={values.postalCode ?? ""} className="tnum" />
              </Field>
            </div>
          </Card>

          <Card id="church" className="scroll-mt-20">
            <CardHeader title="Church life" subtitle="Salvation, baptism and church history" />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Date of salvation" optional>
                <Input name="salvationDate" type="date" defaultValue={formatDateInput(values.salvationDate)} />
              </Field>
              <Field label="Date of baptism" optional>
                <Input name="baptismDate" type="date" defaultValue={formatDateInput(values.baptismDate)} />
              </Field>
              <Field label="Previous church" optional>
                <Input name="previousChurch" defaultValue={values.previousChurch ?? ""} />
              </Field>
              <Field label="Previous church location" optional>
                <Input name="previousChurchLocation" defaultValue={values.previousChurchLocation ?? ""} />
              </Field>
            </div>
          </Card>

          <Card id="involvement" className="scroll-mt-20">
            <CardHeader title="Involvement" subtitle="Ministries served and areas of interest" />
            <div className="space-y-5 p-5">
              <div>
                <p className="mb-2 text-[13px] font-medium">Ministries</p>
                <div className="flex flex-wrap gap-2">
                  {ministries.map((m) => (
                    <CheckChip
                      key={m.id}
                      name="ministries"
                      value={m.id}
                      label={m.name}
                      defaultChecked={values.ministryIds?.includes(m.id)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[13px] font-medium">Areas of interest</p>
                <div className="flex flex-wrap gap-2">
                  {interests.map((i) => (
                    <CheckChip
                      key={i.id}
                      name="interests"
                      value={i.id}
                      label={i.name}
                      defaultChecked={values.interestIds?.includes(i.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card id="pastoral" className="scroll-mt-20">
            <CardHeader title="Pastoral" subtitle="Prayer requests and private notes" />
            <div className="space-y-4 p-5">
              <Field label="Prayer requests" optional>
                <Textarea name="prayerRequests" defaultValue={values.prayerRequests ?? ""} />
              </Field>
              <Field label="Notes" hint="Visible to office staff only" optional>
                <Textarea name="notes" rows={3} defaultValue={values.notes ?? ""} />
              </Field>
              {show18a ? (
                <div className="grid gap-4 rounded-lg border border-info/30 bg-info-bg/50 p-4 sm:grid-cols-2 dark:bg-info/10">
                  <p className="text-[12.5px] text-[var(--text-muted)] sm:col-span-2">
                    Required only when issuing Section 18A receipts to this
                    person. Ordinary tithes and offerings are not 18A deductible.
                  </p>
                  <Field label="Income tax reference" optional>
                    <Input name="taxRefNumber" defaultValue={values.taxRefNumber ?? ""} className="tnum" />
                  </Field>
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      {/* sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-[var(--card)]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] 2xl:max-w-[1760px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <p className="text-[12.5px] text-[var(--text-muted)]">
            {dirty ? "Unsaved changes" : values.id ? "No changes yet" : "New member"}
          </p>
          <div className="flex gap-2">
            <Link href={values.id ? `/members/${values.id}` : "/members"}>
              <Button type="button" variant="ghost">Cancel</Button>
            </Link>
            <Button type="submit" variant="primary">
              <Save size={15} /> {values.id ? "Save changes" : "Register member"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function CheckChip({
  name, value, label, defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked?: boolean;
}) {
  const [on, setOn] = React.useState(Boolean(defaultChecked));
  return (
    <label
      className={`cursor-pointer rounded-full border px-3 py-1.5 text-[13px] transition-colors select-none ${
        on
          ? "border-bronze-500 bg-bronze-50 font-medium text-bronze-700 dark:bg-bronze-600/20 dark:text-bronze-300"
          : "hover:bg-sand-100 dark:hover:bg-sand-800"
      }`}
    >
      <input
        type="checkbox"
        name={name}
        value={value}
        checked={on}
        onChange={(e) => setOn(e.target.checked)}
        className="sr-only"
      />
      {label}
    </label>
  );
}
