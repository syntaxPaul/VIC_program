import Link from "next/link";
import { Save } from "lucide-react";
import { formatDateInput, formatTimeInput } from "@/lib/format";
import { Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import type { YouthMeeting } from "@/generated/prisma";

export const DIVISIONS = [
  ["INTERMEDIATE", "Intermediate"],
  ["YOUTH", "Youth"],
  ["YOUNG_ADULTS", "Young adults"],
  ["MEN", "Men"],
] as const;

const KINDS = [
  ["WORD_STUDY", "Word study"], ["FELLOWSHIP", "Fellowship"], ["PRAYER", "Prayer meeting"],
  ["OUTREACH", "Outreach"], ["SPORTS", "Sports"], ["CAMP", "Camp"], ["CONFERENCE", "Conference"],
  ["SOCIAL", "Social"], ["OTHER", "Other"],
] as const;

export function YouthMeetingForm({
  action,
  value,
  division,
}: {
  action: (fd: FormData) => Promise<void>;
  value?: YouthMeeting | null;
  division?: string;
}) {
  return (
    <form action={action} className="space-y-4">
      <Card>
        <CardHeader title="The meeting" subtitle="It goes onto the church calendar as soon as it is saved" />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2">
            <Input name="title" required defaultValue={value?.title ?? ""} placeholder="e.g. Friday word study" />
          </Field>
          <Field label="Division">
            <Select name="division" required defaultValue={value?.division ?? division ?? "YOUTH"}>
              {DIVISIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Kind">
            <Select name="kind" defaultValue={value?.kind ?? "WORD_STUDY"}>
              {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Date"><Input name="date" type="date" required defaultValue={formatDateInput(value?.startsAt)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts"><Input name="startTime" type="time" defaultValue={formatTimeInput(value?.startsAt) || "18:00"} /></Field>
            <Field label="Ends" optional><Input name="endTime" type="time" defaultValue={formatTimeInput(value?.endsAt)} /></Field>
          </div>
          <Field label="Where" optional><Input name="location" defaultValue={value?.location ?? ""} /></Field>
          <Field label="Leading" optional><Input name="leader" defaultValue={value?.leader ?? ""} /></Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Word study" subtitle="Filled in for a study, so the division keeps a record of what it has covered" />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Field label="Passage" optional><Input name="scripture" defaultValue={value?.scripture ?? ""} placeholder="Romans 12:1–8" /></Field>
          <Field label="Theme" optional><Input name="theme" defaultValue={value?.theme ?? ""} placeholder="Living sacrifices" /></Field>
          <Field label="Outline" optional className="sm:col-span-2"><Textarea name="outline" rows={5} defaultValue={value?.outline ?? ""} placeholder="The points you will cover" /></Field>
          <Field label="Discussion questions" optional className="sm:col-span-2"><Textarea name="questions" rows={3} defaultValue={value?.questions ?? ""} /></Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Afterwards" />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Field label="How many came" optional><Input name="attended" inputMode="numeric" defaultValue={value?.attended ?? ""} /></Field>
          <Field label="Notes" optional className="sm:col-span-2"><Textarea name="notes" rows={3} defaultValue={value?.notes ?? ""} /></Field>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary"><Save size={15} /> Save</Button>
        <Link href="/youth" className="text-[13px] text-[var(--text-muted)] hover:underline">Cancel</Link>
      </div>
    </form>
  );
}
