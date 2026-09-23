import Link from "next/link";
import { Save } from "lucide-react";
import { formatDate, formatDateInput } from "@/lib/format";
import { WELFARE_KINDS } from "@/lib/welfare-labels";
import { Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import type { WelfareGrant } from "@/generated/prisma";

export function WelfareForm({
  action,
  value,
  members,
  days,
  dayId,
  leaderDefault,
}: {
  action: (fd: FormData) => Promise<void>;
  value?: WelfareGrant | null;
  members: { id: string; fullName: string; memberNumber: string }[];
  days: { id: string; title: string; startsAt: Date }[];
  dayId?: string;
  leaderDefault?: string | null;
}) {
  return (
    <form action={action} className="space-y-4">
      <Card>
        <CardHeader title="Who it is for" subtitle="A member of the church, or somebody who is not on the register" />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Field label="Member" optional className="sm:col-span-2">
            <Select name="memberId" defaultValue={value?.memberId ?? ""}>
              <option value="">Not a member — give the name below</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.fullName} · {m.memberNumber}</option>
              ))}
            </Select>
          </Field>
          <Field label="Name" optional hint="If not a member">
            <Input name="recipientName" defaultValue={value?.recipientName ?? ""} />
          </Field>
          <Field label="Telephone" optional><Input name="recipientPhone" inputMode="tel" defaultValue={value?.recipientPhone ?? ""} /></Field>
          <Field label="Household" optional className="sm:col-span-2" hint="Who else it helps — e.g. mother and three children">
            <Input name="household" defaultValue={value?.household ?? ""} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="What is given" />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Field label="Kind">
            <Select name="kind" defaultValue={value?.kind ?? "FOOD_PARCEL"}>
              {WELFARE_KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={value?.status ?? "PLANNED"}>
              <option value="PLANNED">Planned</option>
              <option value="GIVEN">Given</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
          </Field>
          <Field label="Items" className="sm:col-span-2">
            <Textarea name="items" rows={2} required defaultValue={value?.items ?? ""} placeholder="10kg mealie meal, 2L oil, rice, tinned fish · or: two school jerseys, size 10" />
          </Field>
          <Field label="Quantity" optional><Input name="quantity" inputMode="numeric" defaultValue={value?.quantity ?? ""} /></Field>
          <Field label="Estimated value (R)" optional hint="For the church's records"><Input name="estimatedValue" inputMode="decimal" defaultValue={value?.estimatedValue ?? ""} /></Field>
          <Field label="Date"><Input name="date" type="date" required defaultValue={formatDateInput(value?.date) || formatDateInput(new Date())} /></Field>
          <Field label="Authorised by" optional hint="The leader who approved it">
            <Input name="authorisedBy" defaultValue={value?.authorisedBy ?? leaderDefault ?? ""} />
          </Field>
          <Field label="Distribution day" optional className="sm:col-span-2">
            <Select name="eventId" defaultValue={value?.eventId ?? dayId ?? ""}>
              <option value="">Not part of a distribution day</option>
              {days.map((d) => <option key={d.id} value={d.id}>{d.title} · {formatDate(d.startsAt)}</option>)}
            </Select>
          </Field>
          <label className="flex items-start gap-3 text-[13.5px] sm:col-span-2">
            <input type="checkbox" name="confidential" defaultChecked={value?.confidential ?? true} className="mt-0.5 size-4" />
            <span>
              <span className="font-medium">Keep the name confidential</span>
              <span className="block text-[12.5px] text-[var(--text-muted)]">
                Only the discipleship office, the pastor and the administrator see who received it.
                Everyone else sees that help was given, and its value.
              </span>
            </span>
          </label>
          <Field label="Notes" optional className="sm:col-span-2"><Textarea name="notes" rows={3} defaultValue={value?.notes ?? ""} /></Field>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary"><Save size={15} /> Save</Button>
        <Link href="/welfare" className="text-[13px] text-[var(--text-muted)] hover:underline">Cancel</Link>
      </div>
    </form>
  );
}
