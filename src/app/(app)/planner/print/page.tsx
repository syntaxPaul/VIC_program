import { Suspense } from "react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { today } from "@/lib/demo";
import { enumLabel, formatDate } from "@/lib/format";
import { MonthCalendar, CATEGORY_COLOR } from "@/components/calendar";
import { PrintBar, PrintSheet } from "@/components/print-sheet";

export default async function PrintablePlanner({
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

  const [events, session] = await Promise.all([
    db.event.findMany({
      where: { deletedAt: null, startsAt: { gte: monthStart, lte: monthEnd } },
      orderBy: { startsAt: "asc" },
    }),
    getSession(),
  ]);

  const label = new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric" }).format(monthStart);

  return (
    <>
      <PrintBar backHref="/planner" label="Print calendar" />
      <PrintSheet
        title="Church Planner"
        period={label}
        generatedBy={session?.name}
        landscape
      >
        <Suspense fallback={<div className="h-[600px]" />}>
          <MonthCalendar
            year={year}
            month={month}
            events={events.map((e) => ({
              id: e.id, title: e.title, category: e.category,
              startsAt: e.startsAt.toISOString(), allDay: e.allDay, location: e.location,
            }))}
          />
        </Suspense>

        <div className="mt-5 break-inside-avoid">
          <h3 className="mb-2 text-[12px] font-semibold tracking-wide uppercase">
            Events this month
          </h3>
          {events.length === 0 ? (
            <p className="text-neutral-500 italic">Nothing scheduled.</p>
          ) : (
            <table className="w-full border-collapse text-[10.5px]">
              <thead>
                <tr>
                  <th className="w-24 border-b border-black py-1 text-left font-semibold">Date</th>
                  <th className="w-16 border-b border-black py-1 text-left font-semibold">Time</th>
                  <th className="border-b border-black py-1 text-left font-semibold">Event</th>
                  <th className="w-28 border-b border-black py-1 text-left font-semibold">Category</th>
                  <th className="w-36 border-b border-black py-1 text-left font-semibold">Location</th>
                  <th className="w-28 border-b border-black py-1 text-left font-semibold">Led by</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td className="tnum py-1">{formatDate(e.startsAt)}</td>
                    <td className="tnum py-1">
                      {e.allDay
                        ? "All day"
                        : new Intl.DateTimeFormat("en-ZA", {
                            hour: "2-digit", minute: "2-digit", hour12: false,
                          }).format(e.startsAt)}
                    </td>
                    <td className="py-1">{e.title}</td>
                    <td className="py-1">{enumLabel(e.category)}</td>
                    <td className="py-1">{e.location ?? "—"}</td>
                    <td className="py-1">{e.leader ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </PrintSheet>
    </>
  );
}
