"use client";

import Link from "next/link";
import { Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import { formatDateInput } from "@/lib/format";

type Option = { id: string; fullName: string; memberNumber: string };

export function BaptismForm({
  action,
  values = {},
  members,
  defaultYear,
  cancelHref,
}: {
  action: (formData: FormData) => void;
  values?: Record<string, unknown>;
  members: Option[];
  defaultYear: number;
  cancelHref: string;
}) {
  const v = values as {
    id?: string; memberId?: string | null; fullName?: string | null;
    dob?: Date | null; placeOfBirth?: string | null; parentNames?: string | null;
    programmeYear?: number; status?: string; classStartDate?: Date | null;
    baptismDate?: Date | null; placeOfBaptism?: string | null; mode?: string | null;
    officiant?: string | null; witness1?: string | null; witness2?: string | null;
    scriptureVerse?: string | null; notes?: string | null;
  };

  return (
    <form action={action} className="space-y-4">
      <Card>
        <CardHeader title="Candidate" subtitle="A candidate need not already be a member" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Link to member" optional className="sm:col-span-2">
            <Select name="memberId" defaultValue={v.memberId ?? ""}>
              <option value="">Not a member yet</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} ({m.memberNumber})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Full name" hint="As it should appear on the certificate">
            <Input name="fullName" required defaultValue={v.fullName ?? ""} />
          </Field>
          <Field label="Date of birth" optional>
            <Input name="dob" type="date" defaultValue={formatDateInput(v.dob)} />
          </Field>
          <Field label="Place of birth" optional>
            <Input name="placeOfBirth" defaultValue={v.placeOfBirth ?? ""} />
          </Field>
          <Field label="Parents' names" optional>
            <Input name="parentNames" defaultValue={v.parentNames ?? ""} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Programme" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Programme year">
            <Input
              name="programmeYear"
              type="number"
              required
              defaultValue={v.programmeYear ?? defaultYear}
              className="tnum"
            />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={v.status ?? "CANDIDATE"}>
              <option value="CANDIDATE">Candidate</option>
              <option value="CLASS_IN_PROGRESS">Class in progress</option>
              <option value="APPROVED">Approved for baptism</option>
              <option value="BAPTISED">Baptised</option>
              <option value="WITHDRAWN">Withdrawn</option>
            </Select>
          </Field>
          <Field label="Class start date" optional>
            <Input name="classStartDate" type="date" defaultValue={formatDateInput(v.classStartDate)} />
          </Field>
          <Field label="Notes" optional>
            <Input name="notes" defaultValue={v.notes ?? ""} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Baptism"
          subtitle="Completed once the baptism has taken place — a register number is then assigned"
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Date of baptism" optional>
            <Input name="baptismDate" type="date" defaultValue={formatDateInput(v.baptismDate)} />
          </Field>
          <Field label="Place of baptism" optional>
            <Input name="placeOfBaptism" defaultValue={v.placeOfBaptism ?? ""} />
          </Field>
          <Field label="Mode" optional>
            <Select name="mode" defaultValue={v.mode ?? "Immersion"}>
              <option value="Immersion">Immersion</option>
              <option value="Affusion">Affusion (pouring)</option>
              <option value="Sprinkling">Sprinkling</option>
            </Select>
          </Field>
          <Field label="Officiating minister" optional>
            <Input name="officiant" defaultValue={v.officiant ?? ""} />
          </Field>
          <Field label="First witness" optional>
            <Input name="witness1" defaultValue={v.witness1 ?? ""} />
          </Field>
          <Field label="Second witness" optional>
            <Input name="witness2" defaultValue={v.witness2 ?? ""} />
          </Field>
          <Field label="Scripture verse" hint="Printed on the certificate" optional className="sm:col-span-2">
            <Input name="scriptureVerse" defaultValue={v.scriptureVerse ?? ""} placeholder="e.g. Romans 6:4" />
          </Field>
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <Link href={cancelHref}><Button type="button" variant="ghost">Cancel</Button></Link>
          <Button type="submit" variant="primary">
            {v.id ? "Save changes" : "Add candidate"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
