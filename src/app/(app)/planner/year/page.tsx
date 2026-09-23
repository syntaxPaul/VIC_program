import Link from "next/link";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { db } from "@/lib/db";
import { today } from "@/lib/demo";
import { Button, Card, CardHeader, PageHeader } from "@/components/ui";
import {
  YearWallChart, YearKeyDates, YearLegend, type YearEvent,
} from "@/components/year-planner";

export default async function YearPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>;
}) {
  const sp = await searchParams;
  const now = today();
  const year = parseInt(sp.y ?? "", 10) || now.getFullYear();

  const events = await db.event.findMany({
    where: {
      deletedAt: null,
      startsAt: {
        gte: new Date(year, 0, 1),
        lte: new Date(year, 11, 31, 23, 59, 59),
      },
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true, title: true, category: true, startsAt: true, location: true,
    },
  });

  const list: YearEvent[] = events;
  const categories = [...new Set(list.map((e) => e.category))];

  // Sundays in the year, for the "how much of the year is planned" line.
  const sundays = (() => {
    let n = 0;
    const d = new Date(year, 0, 1);
    while (d.getFullYear() === year) {
      if (d.getDay() === 0) n++;
      d.setDate(d.getDate() + 1);
    }
    return n;
  })();
  const plannedSundays = new Set(
    list.filter((e) => e.startsAt.getDay() === 0).map((e) => e.startsAt.getDate() + "-" + e.startsAt.getMonth()),
  ).size;

  return (
    <div className="mx-auto max-w-[1400px] 2xl:max-w-[1760px]">
      <PageHeader
        title={`The year ${year}`}
        description="Every service, meeting and special event on one sheet."
        actions={
          <>
            <Link href={`/planner/year?y=${year - 1}`}>
              <Button><ChevronLeft size={15} /> {year - 1}</Button>
            </Link>
            <Link href={`/planner/year?y=${year + 1}`}>
              <Button>{year + 1} <ChevronRight size={15} /></Button>
            </Link>
            <Link href={`/planner/year/print?y=${year}`}>
              <Button variant="primary"><Printer size={15} /> Printable wall chart</Button>
            </Link>
          </>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5">
          <p className="text-[13px] text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text)]">{list.length}</span>{" "}
            {list.length === 1 ? "entry" : "entries"} ·{" "}
            <span className="font-medium text-[var(--text)]">{plannedSundays}</span> of{" "}
            {sundays} Sundays have something on them
          </p>
          <YearLegend categories={categories} />
        </div>
        {/* Twelve months side by side need a wide screen. A phone held upright
            gets the key dates below instead; turned sideways, it gets the chart. */}
        <p className="px-4 py-5 text-[13px] text-[var(--text-muted)] sm:hidden">
          Turn your phone sideways to see the whole year as a wall chart, or print
          it. Every date is listed under Key dates below.
        </p>
        <div className="hidden overflow-x-auto p-4 sm:block">
          <div className="min-w-[760px]">
            <YearWallChart
              year={year}
              events={list}
              linkMonths
              todayDate={now}
            />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Key dates" />
        <div className="p-4">
          <YearKeyDates year={year} events={list} columns={3} />
        </div>
      </Card>
    </div>
  );
}
