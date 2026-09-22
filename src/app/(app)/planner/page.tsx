import Link from "next/link";
import { Suspense } from "react";
import { CalendarRange, Plus, Printer } from "lucide-react";
import { db } from "@/lib/db";
import { today } from "@/lib/demo";
import { formatDate, enumLabel } from "@/lib/format";
import { saveEvent } from "@/lib/actions/planner";
import { MonthCalendar } from "@/components/calendar";
import { CATEGORY_COLOR } from "@/lib/event-colors";
import {
  Button, Card, CardHeader, Field, Input, PageHeader, Select, Textarea,
} from "@/components/ui";
import type { EventCategory } from "@/generated/prisma";

const CATEGORIES: EventCategory[] = [
  "SERVICE", "MEETING", "OUTREACH", "FUNDRAISING", "CONFERENCE",
  "BAPTISM", "YOUTH", "WOMEN", "MEN", "CHILDREN", "OTHER",
];

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const sp = await searchParams;
  const now = today();
  const year = parseInt(sp.y ?? "", 10) || now.getFullYear();
  const month = sp.m !== undefined ? parseInt(sp.m, 10) : now.getMonth();

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

  const [events, upcoming] = await Promise.all([
    db.event.findMany({
      where: { deletedAt: null, startsAt: { gte: monthStart, lte: monthEnd } },
      orderBy: { startsAt: "asc" },
    }),
    db.event.findMany({
      where: { deletedAt: null, startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 8,
    }),
  ]);

  const action = saveEvent.bind(null, null);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Church planner"
        description="Services, meetings, outreaches and special events."
        actions={
          <>
            <Link href={`/planner/year?y=${year}`}>
              <Button><CalendarRange size={15} /> Year plan</Button>
            </Link>
            <Link href={`/planner/print?y=${year}&m=${month}`}>
              <Button><Printer size={15} /> Printable calendar</Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="p-4">
          <Suspense fallback={<div className="h-[600px]" />}>
            <MonthCalendar
              year={year}
              month={month}
              events={events.map((e) => ({
                id: e.id,
                title: e.title,
                category: e.category,
                startsAt: e.startsAt.toISOString(),
                allDay: e.allDay,
                location: e.location,
              }))}
            />
          </Suspense>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t pt-3">
            {CATEGORIES.map((c) => (
              <span key={c} className="flex items-center gap-1.5 text-[11.5px] text-[var(--text-muted)]">
                <span
                  className="exact-color h-2 w-2 rounded-full"
                  style={{ background: CATEGORY_COLOR[c] }}
                />
                {enumLabel(c)}
              </span>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Add event" />
            <form action={action}>
              <div className="space-y-4 p-5">
                <Field label="Title">
                  <Input name="title" required placeholder="e.g. Youth Conference" />
                </Field>
                <Field label="Category">
                  <Select name="category" defaultValue="SERVICE">
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{enumLabel(c)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Starts">
                  <Input name="startsAt" type="datetime-local" required />
                </Field>
                <Field label="Ends" optional>
                  <Input name="endsAt" type="datetime-local" />
                </Field>
                <Field label="Location" optional>
                  <Input name="location" placeholder="e.g. Main Sanctuary" />
                </Field>
                <Field label="Led by" optional>
                  <Input name="leader" />
                </Field>
                <Field label="Notes" optional>
                  <Textarea name="description" rows={2} />
                </Field>
              </div>
              <div className="border-t px-5 py-3">
                <Button type="submit" variant="primary" className="w-full">
                  <Plus size={15} /> Add to calendar
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader title="Coming up" />
            {upcoming.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-[var(--text-muted)]">
                Nothing scheduled.
              </p>
            ) : (
              <ul className="divide-y">
                {upcoming.map((e) => (
                  <li key={e.id} className="flex items-start gap-2.5 px-5 py-3">
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: CATEGORY_COLOR[e.category] }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium">{e.title}</p>
                      <p className="truncate text-[12px] text-[var(--text-muted)]">
                        {formatDate(e.startsAt)}
                        {!e.allDay
                          ? ` · ${new Intl.DateTimeFormat("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false }).format(e.startsAt)}`
                          : ""}
                        {e.location ? ` · ${e.location}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
