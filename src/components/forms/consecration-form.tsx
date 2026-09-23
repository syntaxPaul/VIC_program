import Link from "next/link";
import { Save } from "lucide-react";
import { formatDateInput, formatTimeInput } from "@/lib/format";
import { Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import type { Consecration } from "@/generated/prisma";

export function ConsecrationForm({
  action,
  value,
}: {
  action: (fd: FormData) => Promise<void>;
  value?: Consecration | null;
}) {
  return (
    <form action={action} className="space-y-4">
      <Card>
        <CardHeader title="The child" />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Field label="Child's full name" className="sm:col-span-2"><Input name="childName" required defaultValue={value?.childName ?? ""} /></Field>
          <Field label="Date of birth" optional><Input name="childDob" type="date" defaultValue={formatDateInput(value?.childDob)} /></Field>
          <Field label="Gender" optional>
            <Select name="childGender" defaultValue={value?.childGender ?? ""}>
              <option value="">—</option>
              <option value="MALE">Boy</option>
              <option value="FEMALE">Girl</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Parents" />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Field label="Father" optional><Input name="fatherName" defaultValue={value?.fatherName ?? ""} /></Field>
          <Field label="Mother" optional><Input name="motherName" defaultValue={value?.motherName ?? ""} /></Field>
          <Field label="Guardian" optional hint="If not the parents"><Input name="guardianName" defaultValue={value?.guardianName ?? ""} /></Field>
          <Field label="Telephone" optional><Input name="parentPhone" inputMode="tel" defaultValue={value?.parentPhone ?? ""} /></Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="The consecration" />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Field label="Status">
            <Select name="status" defaultValue={value?.status ?? "REQUESTED"}>
              <option value="REQUESTED">Requested by the parents</option>
              <option value="SCHEDULED">Date set</option>
              <option value="CONSECRATED">Consecrated</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
          </Field>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <Field label="Date" optional><Input name="consecrationDate" type="date" defaultValue={formatDateInput(value?.consecrationDate)} /></Field>
            <Field label="Time" optional><Input name="time" type="time" defaultValue={formatTimeInput(value?.consecrationDate) || "10:00"} /></Field>
          </div>
          <Field label="Where" optional><Input name="place" defaultValue={value?.place ?? ""} placeholder="Main sanctuary" /></Field>
          <Field label="Officiating" optional><Input name="officiant" defaultValue={value?.officiant ?? ""} /></Field>
          <Field label="Scripture" optional><Input name="scripture" defaultValue={value?.scripture ?? ""} placeholder="1 Samuel 1:27–28" /></Field>
          <Field label="Witnesses" optional><Input name="witnesses" defaultValue={value?.witnesses ?? ""} /></Field>
          <Field label="Notes" optional className="sm:col-span-2"><Textarea name="notes" rows={3} defaultValue={value?.notes ?? ""} /></Field>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary"><Save size={15} /> Save</Button>
        <Link href="/consecrations" className="text-[13px] text-[var(--text-muted)] hover:underline">Cancel</Link>
      </div>
    </form>
  );
}
