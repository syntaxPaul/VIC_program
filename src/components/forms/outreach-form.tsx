import Link from "next/link";
import { Save } from "lucide-react";
import { formatDateInput, formatTimeInput } from "@/lib/format";
import { OUTREACH_KINDS } from "@/lib/outreach-labels";
import { Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import type { Outreach } from "@/generated/prisma";

export function OutreachForm({
  action,
  value,
  leaderDefault,
}: {
  action: (fd: FormData) => Promise<void>;
  value?: Outreach | null;
  leaderDefault?: string | null;
}) {
  return (
    <form action={action} className="space-y-4">
      <Card>
        <CardHeader title="The plan" subtitle="It goes onto the church calendar as soon as it is saved" />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2">
            <Input name="title" required defaultValue={value?.title ?? ""} placeholder="e.g. Saturday morning in Extension 11" />
          </Field>
          <Field label="Kind">
            <Select name="kind" defaultValue={value?.kind ?? "STREET_EVANGELISM"}>
              {OUTREACH_KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={value?.status ?? "PLANNED"}>
              <option value="PLANNED">Planned</option>
              <option value="DONE">Done</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
          </Field>
          <Field label="Date"><Input name="date" type="date" required defaultValue={formatDateInput(value?.startsAt)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts"><Input name="startTime" type="time" defaultValue={formatTimeInput(value?.startsAt) || "09:00"} /></Field>
            <Field label="Ends" optional><Input name="endTime" type="time" defaultValue={formatTimeInput(value?.endsAt)} /></Field>
          </div>
          <Field label="Where" optional><Input name="location" defaultValue={value?.location ?? ""} placeholder="Meeting point or venue" /></Field>
          <Field label="Area" optional><Input name="area" defaultValue={value?.area ?? ""} placeholder="Suburb, section or streets" /></Field>
          <Field label="Leading" optional><Input name="leader" defaultValue={value?.leader ?? leaderDefault ?? ""} /></Field>
          <Field label="Team size" optional><Input name="teamSize" inputMode="numeric" defaultValue={value?.teamSize ?? ""} /></Field>
          <Field label="Team" optional className="sm:col-span-2"><Input name="team" defaultValue={value?.team ?? ""} placeholder="Who is going" /></Field>
          <Field label="Plan" optional className="sm:col-span-2"><Textarea name="plan" rows={3} defaultValue={value?.plan ?? ""} placeholder="How the day will run, who does what" /></Field>
          <Field label="Materials" optional><Input name="materials" defaultValue={value?.materials ?? ""} placeholder="Tracts, Bibles, sound system" /></Field>
          <Field label="Estimated cost (R)" optional><Input name="estimatedCost" inputMode="decimal" defaultValue={value?.estimatedCost ?? ""} /></Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="What came of it" subtitle="Filled in afterwards — this is what the year adds up to" />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
          <Field label="People reached" optional><Input name="peopleReached" inputMode="numeric" defaultValue={value?.peopleReached ?? ""} /></Field>
          <Field label="Gave their lives" optional><Input name="decisions" inputMode="numeric" defaultValue={value?.decisions ?? ""} /></Field>
          <Field label="To follow up" optional><Input name="followUpsDue" inputMode="numeric" defaultValue={value?.followUpsDue ?? ""} /></Field>
          <Field label="Report" optional className="sm:col-span-3"><Textarea name="report" rows={4} defaultValue={value?.report ?? ""} placeholder="How it went, testimonies, what to do differently" /></Field>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary"><Save size={15} /> Save</Button>
        <Link href="/outreach" className="text-[13px] text-[var(--text-muted)] hover:underline">Cancel</Link>
      </div>
    </form>
  );
}
