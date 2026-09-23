"use client";

import * as React from "react";
import { submitApplication } from "@/lib/actions/applications";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { IdNumberField } from "@/components/id-number-field";

const PROVINCES = [
  "Gauteng", "Limpopo", "Mpumalanga", "North West", "Free State",
  "KwaZulu-Natal", "Eastern Cape", "Western Cape", "Northern Cape",
];

const INTERESTS = [
  "Choir or worship team", "Ushering", "Youth", "Women's fellowship",
  "Men's fellowship", "Children's ministry", "Outreach", "Prayer team",
];

export function ApplyForm({ churchName }: { churchName: string }) {
  const [openedAt] = React.useState(() => Date.now());
  const [state, setState] = React.useState<{ done: boolean; error: string | null; busy: boolean }>({
    done: false, error: null, busy: false,
  });

  async function action(formData: FormData) {
    setState({ done: false, error: null, busy: true });
    const res = await submitApplication(formData);
    if (res.ok) setState({ done: true, error: null, busy: false });
    else setState({ done: false, error: res.error, busy: false });
  }

  if (state.done) {
    return (
      <div className="py-10 text-center">
        <h2 className="font-serif text-[24px] font-semibold">Thank you</h2>
        <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-sand-600">
          Your details have been sent to the church office. Someone will be in
          touch, and you are welcome to speak to one of the leaders at the next
          service.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      {/* Not shown to anyone; automated submissions fill it in. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />
      <input type="hidden" name="openedAt" value={openedAt} />

      {state.error ? (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger-bg px-3 py-2.5 text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}

      <section className="space-y-4">
        <h2 className="border-b pb-1.5 font-serif text-[16px] font-semibold">About you</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><Input name="fullName" required maxLength={120} /></Field>
          <Field label="Surname"><Input name="surname" required maxLength={120} /></Field>
          <Field label="ID number" optional className="sm:col-span-2">
            <IdNumberField />
          </Field>
          <Field label="Date of birth" optional><Input name="dob" type="date" /></Field>
          <Field label="Gender" optional>
            <Select name="gender" defaultValue="">
              <option value="">—</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </Select>
          </Field>
          <Field label="Marital status" optional>
            <Select name="maritalStatus" defaultValue="">
              <option value="">—</option>
              <option value="SINGLE">Single</option>
              <option value="MARRIED">Married</option>
              <option value="WIDOWED">Widowed</option>
              <option value="DIVORCED">Divorced</option>
            </Select>
          </Field>
          <Field label="Children" optional hint="Names and ages, if any">
            <Input name="children" maxLength={300} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="border-b pb-1.5 font-serif text-[16px] font-semibold">How we reach you</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telephone" optional hint="A number shared with family is fine">
            <Input name="phone" inputMode="tel" maxLength={30} />
          </Field>
          <Field label="Email" optional><Input name="email" type="email" maxLength={160} /></Field>
          <Field label="Street address" optional className="sm:col-span-2">
            <Input name="addressLine" maxLength={200} />
          </Field>
          <Field label="City or township" optional><Input name="city" maxLength={80} /></Field>
          <Field label="Province" optional>
            <Select name="province" defaultValue="">
              <option value="">—</option>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </Field>
          <Field label="Postal code" optional><Input name="postalCode" maxLength={10} /></Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="border-b pb-1.5 font-serif text-[16px] font-semibold">Your walk</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date you gave your life to Christ" optional>
            <Input name="salvationDate" type="date" />
          </Field>
          <Field label="Date you were baptised" optional hint="Leave blank if you have not been">
            <Input name="baptismDate" type="date" />
          </Field>
          <Field label="Previous church" optional><Input name="previousChurch" maxLength={160} /></Field>
          <Field label="Where was it" optional><Input name="previousChurchLocation" maxLength={160} /></Field>
        </div>

        <fieldset>
          <legend className="mb-2 text-[13px] font-medium">
            Where would you like to serve? <span className="text-[var(--text-muted)]">optional</span>
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {INTERESTS.map((i) => (
              <label key={i} className="flex items-center gap-2 text-[13.5px]">
                <input type="checkbox" name="interestedIn" value={i} className="size-4" />
                {i}
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Anything you would like prayer for" optional>
          <Textarea name="prayerRequests" rows={4} maxLength={2000} />
        </Field>
      </section>

      <div className="border-t pt-5">
        <p className="mb-4 text-[12.5px] leading-relaxed text-sand-600">
          {churchName} keeps these details to care for you as a member and for
          the records a church is required to keep. They are not shared with
          anyone else. Speak to the office at any time to see or correct what
          is held about you.
        </p>
        <Button type="submit" variant="primary" className="w-full" disabled={state.busy}>
          {state.busy ? "Sending…" : "Send my details"}
        </Button>
      </div>
    </form>
  );
}
