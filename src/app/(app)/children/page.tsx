import Link from "next/link";
import { Blocks, CalendarDays, Plus, Smile, Users } from "lucide-react";
import { db } from "@/lib/db";
import { today } from "@/lib/demo";
import { can } from "@/lib/roles";
import { requireArea } from "@/lib/guards";
import { financialYearBounds } from "@/lib/finance";
import { enumLabel, formatDate, formatTime } from "@/lib/format";
import { KpiGrid, KpiTile } from "@/components/kpi";
import { Button, PageHeader } from "@/components/ui";
import { Panel, Row } from "@/components/home/kit";

export default async function ChildrenPage() {
  const session = await requireArea("children");
  const writable = can(session.role, "children", true);
  const now = today();
  const fy = financialYearBounds(now, 3);

  const [dept, upcoming, past, yearAgg] = await Promise.all([
    db.department.findUnique({ where: { code: "CHILD" } }),
    db.childrensActivity.findMany({
      where: { deletedAt: null, startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 10,
    }),
    db.childrensActivity.findMany({
      where: { deletedAt: null, startsAt: { lt: now } },
      orderBy: { startsAt: "desc" },
      take: 12,
    }),
    db.childrensActivity.aggregate({
      where: { deletedAt: null, startsAt: { gte: fy.start, lt: now } },
      _count: true,
      _sum: { attended: true },
      _avg: { attended: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-[1200px] 2xl:max-w-[1500px]">
      <PageHeader
        title="Children's church"
        description={
          dept?.leaderName
            ? `Led by ${dept.leaderName}${dept.leaderPhone ? ` · ${dept.leaderPhone}` : ""}`
            : "Sunday school, Bible clubs, holiday clubs and outings — each one on the church calendar."
        }
        actions={
          writable ? (
            <Link href="/children/new">
              <Button variant="primary"><Plus size={15} /> Plan an activity</Button>
            </Link>
          ) : null
        }
      />

      <KpiGrid>
        <KpiTile label="Sessions this year" value={String(yearAgg._count)} comparison={fy.label} icon={<Blocks size={15} />} accent />
        <KpiTile label="Children reached" value={String(yearAgg._sum.attended ?? 0)} comparison="attendances counted" icon={<Smile size={15} />} />
        <KpiTile label="Average per session" value={String(Math.round(yearAgg._avg.attended ?? 0))} comparison="where a count was taken" icon={<Users size={15} />} />
        <KpiTile label="Next" value={upcoming[0] ? formatDate(upcoming[0].startsAt) : "—"} comparison={upcoming[0]?.title ?? "nothing planned"} icon={<CalendarDays size={15} />} />
      </KpiGrid>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Panel title="Coming up" href="/planner" hrefLabel="Calendar" empty="Nothing planned yet.">
          {upcoming.map((a) => (
            <Row
              key={a.id}
              href={`/children/${a.id}`}
              title={a.title}
              meta={[enumLabel(a.ageGroup), a.leader, a.location].filter(Boolean).join(" · ")}
              right={`${formatDate(a.startsAt)} ${formatTime(a.startsAt)}`}
            />
          ))}
        </Panel>

        <Panel title="Lately" subtitle="With how many children came" empty="No sessions recorded yet.">
          {past.map((a) => (
            <Row
              key={a.id}
              href={`/children/${a.id}`}
              title={a.title}
              meta={[enumLabel(a.kind), a.lessonTitle].filter(Boolean).join(" · ")}
              right={
                a.attended != null
                  ? `${a.attended} came`
                  : <span className="text-bronze-700 dark:text-bronze-300">count not taken</span>
              }
            />
          ))}
        </Panel>
      </div>
    </div>
  );
}
