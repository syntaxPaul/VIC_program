import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { today } from "@/lib/demo";
import { PrintBar, PrintSheet } from "@/components/print-sheet";
import {
  YearWallChart, YearKeyDates, YearLegend, type YearEvent,
} from "@/components/year-planner";

export default async function PrintableYearPlanner({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>;
}) {
  const sp = await searchParams;
  const now = today();
  const year = parseInt(sp.y ?? "", 10) || now.getFullYear();

  const [events, session] = await Promise.all([
    db.event.findMany({
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
    }),
    getSession(),
  ]);

  const list: YearEvent[] = events;
  const categories = [...new Set(list.map((e) => e.category))];

  return (
    <>
      <PrintBar backHref={`/planner/year?y=${year}`} label="Print wall chart" />
      <PrintSheet
        title="Church Year Planner"
        period={String(year)}
        subtitle="Wall chart"
        generatedBy={session?.name}
        landscape
      >
        <div className="mb-3">
          <YearLegend categories={categories} dense />
        </div>

        <YearWallChart year={year} events={list} dense todayDate={now} />

        {/* The list starts on its own sheet: the chart is what goes on the
            wall, and the dates behind it are for the desk. */}
        <div className="break-before-page pt-6">
          <p className="mb-2 border-b border-black pb-1 text-[11px] font-semibold">
            Key dates · {year}
          </p>
          <YearKeyDates year={year} events={list} dense columns={4} />
        </div>
      </PrintSheet>
    </>
  );
}
