"use client";

import Link from "next/link";
import { Lock, Pin, Save } from "lucide-react";
import { Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import { formatDateInput, enumLabel } from "@/lib/format";

const CATEGORIES = ["GENERAL", "SERMON", "MEETING", "VISIT", "PRAYER", "FOLLOW_UP"];

export function NoteForm({
  action,
  values = {},
}: {
  action: (formData: FormData) => void;
  values?: {
    id?: string; title?: string; body?: string; category?: string;
    noteDate?: Date | null; confidential?: boolean; pinned?: boolean;
    tags?: string | null;
  };
}) {
  return (
    <form action={action}>
      <Card>
        <CardHeader title={values.id ? "Edit note" : "New note"} />
        <div className="space-y-4 p-5">
          <Field label="Title">
            <Input
              name="title"
              required
              defaultValue={values.title ?? ""}
              placeholder="e.g. Sunday message — Romans 6"
              autoFocus
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <Select name="category" defaultValue={values.category ?? "GENERAL"}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{enumLabel(c)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Date">
              <Input
                name="noteDate"
                type="date"
                defaultValue={formatDateInput(values.noteDate ?? new Date())}
              />
            </Field>
          </div>

          <Field label="Note">
            <Textarea
              name="body"
              required
              rows={14}
              defaultValue={values.body ?? ""}
              placeholder="Write freely…"
              className="leading-relaxed"
            />
          </Field>

          <Field label="Tags" hint="Comma separated, for searching later" optional>
            <Input name="tags" defaultValue={values.tags ?? ""} placeholder="youth, outreach, budget" />
          </Field>

          <div className="space-y-2.5 rounded-lg border p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                name="confidential"
                defaultChecked={values.confidential}
                className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
              />
              <span>
                <span className="flex items-center gap-1.5 text-[13.5px] font-medium">
                  <Lock size={13} className="text-warning" /> Confidential
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                  Hidden behind a click in the list, so a shared screen does not
                  give it away, and never included in exports or printed reports.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                name="pinned"
                defaultChecked={values.pinned}
                className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
              />
              <span>
                <span className="flex items-center gap-1.5 text-[13.5px] font-medium">
                  <Pin size={13} /> Pin to the top
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <Link href={values.id ? `/notes/${values.id}` : "/notes"}>
            <Button type="button" variant="ghost">Cancel</Button>
          </Link>
          <Button type="submit" variant="primary">
            <Save size={15} /> {values.id ? "Save changes" : "Save note"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
