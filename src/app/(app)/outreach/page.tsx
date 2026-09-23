import Link from "next/link";
import { HeartPulse, Megaphone, Plus, UserCheck, Users } from "lucide-react";
import { db } from "@/lib/db";
import { today } from "@/lib/demo";
import { can } from "@/lib/roles";
import { requireArea } from "@/lib/guards";
import { financialYearBounds } from "@/lib/finance";
import { formatDate, formatTime } from "@/lib/format";
import { outreachKindLabel } from "@/lib/outreach-labels";
import { KpiGrid, KpiTile } from "@/components/kpi";
import { Button, Card, CardHeader, PageHeader } from "@/components/ui";
import { Panel, Row } from "@/components/home/kit";

export default async function OutreachPage() {
  const session = await requireArea("outreach");
  const writable = can(session.role, "outreach", true);
  const now = today();
  const fy = financialYearBounds(now, 3);

  const [dept, upcoming, past, agg, byKind] = await Promise.all([
    db.department.findUnique({ where: { code: "EVAN" } }),
    db.outreach.findMany({ where: { deletedAt: null, status: "PLANNED", startsAt: { gte: new Date(now.getTime() - 864e5) } }, orderBy: { startsAt: "asc" }, take: 10 }),
    db.outreach.findMany({ where: { deletedAt: null, startsAt: { lt: now } }, orderBy: { startsAt: "desc" }, take: 12 }),
    db.outreach.aggregate({
      where: { deletedAt: null, status: "DONE", startsAt: { gte: fy.start, lte: fy.end } },
      _count: true,
      _sum: { peopleReached: true, decisions: true, followUpsDue: true },
    }),
    db.outreach.groupBy({
      by: ["kind"],
      where: { deletedAt: null, status: "DONE", startsAt: { gte: fy.start, lte: fy.end } },
      _count: true,
      _sum: { peopleReached: true, decisions: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-[1200px] 2xl:max-w-[1500px]">
      <PageHeader
        title="Outreach"
        description={dept?.leaderName ? `Led by ${dept.leaderName}` : "Every outreach, from the plan to what came of it."}
        actions={
          writable ? (
            <Link href="/outreach/new">
              <Button variant="primary"><Plus size={15} /> Plan an outreach</Button>
            </Link>
          ) : null
        }
      />

      <KpiGrid>
        <KpiTile label="Outreaches this year" value={String(agg._count)} comparison={fy.label} icon={<Megaphone size={15} />} accent />
        <KpiTile label="People reached" value={String(agg._sum.peopleReached ?? 0)} comparison="across all of them" icon={<Users size={15} />} />
        <KpiTile label="Gave their lives" value={String(agg._sum.decisions ?? 0)} comparison="decisions recorded" icon={<HeartPulse size={15} />} />
        <KpiTile label="To follow up" value={String(agg._sum.followUpsDue ?? 0)} comparison="people named for follow-up" icon={<UserCheck size={15} />} />
      </KpiGrid>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Panel title="Planned" href="/planner" hrefLabel="Calendar" empty="Nothing planned.">
          {upcoming.map((o) => (
            <Row
              key={o.id}
              href={`/outreach/${o.id}`}
              title={o.title}
              meta={[outreachKindLabel(o.kind), o.area ?? o.location, o.teamSize && `team of ${o.teamSize}`].filter(Boolean).join(" · ")}
              right={`${formatDate(o.startsAt)} ${formatTime(o.startsAt)}`}
            />
          ))}
        </Panel>

        <Card>
          <CardHeader title="By kind this year" subtitle="What has been done, and what it reached" />
          {byKind.length ? (
            <div className="divide-y">
              {byKind.sort((a, b) => b._count - a._count).map((k) => (
                <Row
                  key={k.kind}
                  title={outreachKindLabel(k.kind)}
                  meta={`${k._sum.peopleReached ?? 0} reached · ${k._sum.decisions ?? 0} decisions`}
                  right={`${k._count}×`}
                />
              ))}
            </div>
          ) : (
            <p className="px-5 py-6 text-center text-[13px] text-[var(--text-muted)]">Nothing completed yet this year.</p>
          )}
        </Card>

        <Panel title="Lately" className="lg:col-span-2" empty="No outreaches yet.">
          {past.map((o) => (
            <Row
              key={o.id}
              href={`/outreach/${o.id}`}
              title={o.title}
              meta={[outreachKindLabel(o.kind), o.area ?? o.location].filter(Boolean).join(" · ")}
              right={
                o.status === "DONE"
                  ? `${o.peopleReached ?? 0} reached · ${o.decisions ?? 0} decisions`
                  : o.status === "CANCELLED" ? "cancelled"
                  : <span className="text-bronze-700 dark:text-bronze-300">report not filled in</span>
              }
            />
          ))}
        </Panel>
      </div>
    </div>
  );
}
