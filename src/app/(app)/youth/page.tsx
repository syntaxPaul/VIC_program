import Link from "next/link";
import { BookOpen, CalendarDays, Flame, Plus, Users } from "lucide-react";
import { db } from "@/lib/db";
import { today } from "@/lib/demo";
import { can } from "@/lib/roles";
import { requireArea } from "@/lib/guards";
import { financialYearBounds } from "@/lib/finance";
import { enumLabel, formatDate, formatTime } from "@/lib/format";
import { KpiGrid, KpiTile } from "@/components/kpi";
import { Button, PageHeader } from "@/components/ui";
import { Panel, Row } from "@/components/home/kit";
import { DIVISIONS } from "@/components/forms/youth-meeting-form";
import type { YouthDivision } from "@/generated/prisma";

export default async function YouthPage({ searchParams }: { searchParams: Promise<{ division?: string }> }) {
  const session = await requireArea("youth");
  const writable = can(session.role, "youth", true);
  const sp = await searchParams;
  const division = DIVISIONS.some(([v]) => v === sp.division) ? (sp.division as YouthDivision) : undefined;
  const now = today();
  const fy = financialYearBounds(now, 3);
  const where = { deletedAt: null, ...(division ? { division } : {}) };

  const [dept, upcoming, studies, past, agg, byDivision] = await Promise.all([
    db.department.findUnique({ where: { code: "YOUTH" } }),
    db.youthMeeting.findMany({ where: { ...where, startsAt: { gte: now } }, orderBy: { startsAt: "asc" }, take: 10 }),
    db.youthMeeting.findMany({
      where: { ...where, kind: "WORD_STUDY", startsAt: { lt: now } },
      orderBy: { startsAt: "desc" },
      take: 12,
    }),
    db.youthMeeting.findMany({ where: { ...where, startsAt: { lt: now } }, orderBy: { startsAt: "desc" }, take: 10 }),
    db.youthMeeting.aggregate({
      where: { ...where, startsAt: { gte: fy.start, lt: now } },
      _count: true,
      _avg: { attended: true },
    }),
    db.youthMeeting.groupBy({
      by: ["division"],
      where: { deletedAt: null, startsAt: { gte: fy.start, lt: now } },
      _count: true,
    }),
  ]);

  const tab = (v: string | undefined, label: string, count?: number) => {
    const active = division === v;
    return (
      <Link
        key={label}
        href={v ? `/youth?division=${v}` : "/youth"}
        className={`rounded-full border px-3.5 py-1.5 text-[13px] whitespace-nowrap transition-colors ${
          active ? "border-bronze-500 bg-bronze-50 font-medium text-bronze-700 dark:bg-bronze-900/20 dark:text-bronze-300" : "hover:border-bronze-300"
        }`}
      >
        {label}
        {count != null ? <span className="ml-1.5 text-[var(--text-muted)]">{count}</span> : null}
      </Link>
    );
  };

  return (
    <div className="mx-auto max-w-[1200px] 2xl:max-w-[1500px]">
      <PageHeader
        title="Youth"
        description={
          dept?.leaderName
            ? `Led by ${dept.leaderName} · intermediate, youth, young adults and men`
            : "Intermediate, youth, young adults and men — their meetings and their word study."
        }
        actions={
          writable ? (
            <Link href={`/youth/new${division ? `?division=${division}` : ""}`}>
              <Button variant="primary"><Plus size={15} /> Plan a meeting</Button>
            </Link>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {tab(undefined, "All divisions")}
        {DIVISIONS.map(([v, l]) => tab(v, l, byDivision.find((d) => d.division === v)?._count ?? 0))}
      </div>

      <KpiGrid>
        <KpiTile label="Meetings this year" value={String(agg._count)} comparison={division ? enumLabel(division) : "all divisions"} icon={<Flame size={15} />} accent />
        <KpiTile label="Average attendance" value={String(Math.round(agg._avg.attended ?? 0))} comparison="where a count was taken" icon={<Users size={15} />} />
        <KpiTile label="Word studies" value={String(studies.length)} comparison="most recent twelve" icon={<BookOpen size={15} />} />
        <KpiTile label="Next" value={upcoming[0] ? formatDate(upcoming[0].startsAt) : "—"} comparison={upcoming[0]?.title ?? "nothing planned"} icon={<CalendarDays size={15} />} />
      </KpiGrid>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Panel title="Coming up" href="/planner" hrefLabel="Calendar" empty="Nothing planned.">
          {upcoming.map((m) => (
            <Row
              key={m.id}
              href={`/youth/${m.id}`}
              title={m.title}
              meta={[enumLabel(m.division), enumLabel(m.kind), m.leader].filter(Boolean).join(" · ")}
              right={`${formatDate(m.startsAt)} ${formatTime(m.startsAt)}`}
            />
          ))}
        </Panel>

        <Panel title="Word study record" subtitle="What has been studied, and when" empty="No studies recorded yet.">
          {studies.map((m) => (
            <Row
              key={m.id}
              href={`/youth/${m.id}`}
              title={m.scripture ?? m.title}
              meta={[m.theme, enumLabel(m.division), m.leader].filter(Boolean).join(" · ")}
              right={formatDate(m.startsAt)}
            />
          ))}
        </Panel>

        <Panel title="Lately" subtitle="With attendance" empty="No meetings yet." className="lg:col-span-2">
          {past.map((m) => (
            <Row
              key={m.id}
              href={`/youth/${m.id}`}
              title={m.title}
              meta={[enumLabel(m.division), enumLabel(m.kind)].join(" · ")}
              right={m.attended != null ? `${m.attended} came` : formatDate(m.startsAt)}
            />
          ))}
        </Panel>
      </div>
    </div>
  );
}
