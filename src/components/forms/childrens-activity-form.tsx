import Link from "next/link";
import { Save } from "lucide-react";
import { formatDateInput, formatTimeInput } from "@/lib/format";
import { Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import type { ChildrensActivity } from "@/generated/prisma";

const KINDS = [
  ["SUNDAY_SCHOOL", "Sunday school"], ["BIBLE_CLUB", "Bible club"], ["HOLIDAY_CLUB", "Holiday club"],
  ["OUTING", "Outing"], ["PARTY", "Party"], ["CONCERT", "Concert or nativity"], ["CAMP", "Camp"], ["OTHER", "Other"],
] as const;

const AGES = [
  ["ALL_AGES", "All ages"], ["NURSERY", "Nursery (0–3)"], ["BEGINNERS", "Beginners (4–6)"],
  ["PRIMARY", "Primary (7–9)"], ["JUNIORS", "Juniors (10–12)"],
] as const;

export function ChildrensActivityForm({
  action,
  value,
  leaderDefault,
}: {
  action: (fd: FormData) => Promise<void>;
  value?: ChildrensActivity | null;
  leaderDefault?: string | null;
}) {
  return (
    <form action={action} className="space-y-4">
      <Card>
        <CardHeader title="The activity" subtitle="It goes onto the church calendar as soon as it is saved" />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2">
            <Input name="title" required defaultValue={value?.title ?? ""} placeholder="e.g. Sunday school — Noah's ark" />
          </Field>
          <Field label="Kind">
            <Select name="kind" defaultValue={value?.kind ?? "SUNDAY_SCHOOL"}>
              {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Age group">
            <Select name="ageGroup" defaultValue={value?.ageGroup ?? "ALL_AGES"}>
              {AGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Date">
            <Input name="date" type="date" required defaultValue={formatDateInput(value?.startsAt)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts"><Input name="startTime" type="time" defaultValue={formatTimeInput(value?.startsAt) || "09:00"} /></Field>
            <Field label="Ends" optional><Input name="endTime" type="time" defaultValue={formatTimeInput(value?.endsAt)} /></Field>
          </div>
          <Field label="Where" optional><Input name="location" defaultValue={value?.location ?? ""} placeholder="Children's hall" /></Field>
          <Field label="Leading" optional><Input name="leader" defaultValue={value?.leader ?? leaderDefault ?? ""} /></Field>
          <Field label="Helpers" optional className="sm:col-span-2"><Input name="helpers" defaultValue={value?.helpers ?? ""} placeholder="Names of the teachers and helpers" /></Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="The lesson" />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Field label="Lesson" optional><Input name="lessonTitle" defaultValue={value?.lessonTitle ?? ""} /></Field>
          <Field label="Scripture" optional><Input name="scripture" defaultValue={value?.scripture ?? ""} placeholder="Genesis 6–9" /></Field>
          <Field label="Memory verse" optional className="sm:col-span-2"><Input name="memoryVerse" defaultValue={value?.memoryVerse ?? ""} /></Field>
          <Field label="Materials needed" optional className="sm:col-span-2"><Textarea name="materials" rows={2} defaultValue={value?.materials ?? ""} placeholder="Crayons, printed colouring sheets, juice" /></Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Children and parents" />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Field label="Expected" optional><Input name="expectedChildren" inputMode="numeric" defaultValue={value?.expectedChildren ?? ""} /></Field>
          <Field label="Came" optional hint="Fill in afterwards"><Input name="attended" inputMode="numeric" defaultValue={value?.attended ?? ""} /></Field>
          <Field label="For the parents" optional className="sm:col-span-2" hint="Consent, collection times, allergies, what to bring">
            <Textarea name="parentNotes" rows={2} defaultValue={value?.parentNotes ?? ""} />
          </Field>
          <Field label="Notes" optional className="sm:col-span-2"><Textarea name="notes" rows={3} defaultValue={value?.notes ?? ""} /></Field>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary"><Save size={15} /> Save</Button>
        <Link href="/children" className="text-[13px] text-[var(--text-muted)] hover:underline">Cancel</Link>
      </div>
    </form>
  );
}
