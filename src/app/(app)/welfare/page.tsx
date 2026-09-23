import Link from "next/link";
import { CalendarPlus, HandHeart, HeartHandshake, Plus, Shirt, Users } from "lucide-react";
import { db } from "@/lib/db";
import { today } from "@/lib/demo";
import { can } from "@/lib/roles";
import { requireArea } from "@/lib/guards";
import { financialYearBounds } from "@/lib/finance";
import { formatDate, formatZAR, formatZARCompact } from "@/lib/format";
import { welfareKindLabel } from "@/lib/welfare-labels";
import { saveDistributionDay } from "@/lib/actions/welfare";
import { KpiGrid, KpiTile } from "@/components/kpi";
import { Button, Card, CardHeader, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { Panel, Row } from "@/components/home/kit";

export default async function WelfarePage() {
  const session = await requireArea("welfare");
  const writable = can(session.role, "welfare", true);
  const seesNames = writable || session.role === "PASTOR";
  const now = today();
  const fy = financialYearBounds(now, 3);

  const [dept, days, recent, given, planned, people] = await Promise.all([
    db.department.findUnique({ where: { code: "WELF" } }),
    db.event.findMany({
      where: { deletedAt: null, category: "WELFARE", startsAt: { gte: new Date(now.getTime() - 864e5) } },
      orderBy: { startsAt: "asc" },
      include: { _count: { select: { welfare: { where: { deletedAt: null } } } } },
      take: 6,
    }),
    db.welfareGrant.findMany({
      where: { deletedAt: null },
      orderBy: { date: "desc" },
      include: { member: { select: { fullName: true } } },
      take: 15,
    }),
    db.welfareGrant.aggregate({
      where: { deletedAt: null, status: "GIVEN", date: { gte: fy.start, lte: fy.end } },
      _count: true,
      _sum: { estimatedValue: true },
    }),
    db.welfareGrant.count({ where: { deletedAt: null, status: "PLANNED" } }),
    db.welfareGrant.findMany({
      where: { deletedAt: null, status: "GIVEN", date: { gte: fy.start, lte: fy.end } },
      select: { memberId: true, recipientName: true },
    }),
  ]);

  const reached = new Set(people.map((p) => p.memberId ?? `n:${p.recipientName?.toLowerCase()}`)).size;
  const who = (g: (typeof recent)[number]) =>
    g.confidential && !seesNames ? "Confidential" : g.member?.fullName ?? g.recipientName ?? "—";

  return (
    <div className="mx-auto max-w-[1200px] 2xl:max-w-[1500px]">
      <PageHeader
        title="Health & welfare"
        description={
          dept?.leaderName
            ? `Led by ${dept.leaderName} · food, clothing and care for members and the community`
            : "Food, clothing and care for members and the community."
        }
        actions={
          writable ? (
            <Link href="/welfare/new">
              <Button variant="primary"><Plus size={15} /> Record help given</Button>
            </Link>
          ) : null
        }
      />

      <KpiGrid>
        <KpiTile label="Given this year" value={String(given._count)} comparison={fy.label} icon={<HeartHandshake size={15} />} accent />
        <KpiTile label="People helped" value={String(reached)} comparison="members and others" icon={<Users size={15} />} />
        <KpiTile label="Value given" value={formatZARCompact(given._sum.estimatedValue ?? 0)} comparison="as estimated" icon={<HandHeart size={15} />} />
        <KpiTile label="Planned" value={String(planned)} comparison="not yet handed over" icon={<Shirt size={15} />} />
      </KpiGrid>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Panel title="Distribution days" subtitle="Food, clothes or blankets handed out on a set day" href="/planner" hrefLabel="Calendar" empty="None organised.">
          {days.map((d) => (
            <Row
              key={d.id}
              href={`/welfare/days/${d.id}`}
              title={d.title}
              meta={[d.location, `${d._count.welfare} ${d._count.welfare === 1 ? "person" : "people"} listed`].filter(Boolean).join(" · ")}
              right={formatDate(d.startsAt)}
            />
          ))}
        </Panel>

        {writable ? (
          <Card>
            <CardHeader title="Organise a distribution day" subtitle="It goes onto the church calendar" />
            <form action={saveDistributionDay} className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
              <Field label="Title" className="sm:col-span-2"><Input name="title" required placeholder="Winter blanket drive" /></Field>
              <Field label="Date"><Input name="date" type="date" required /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="From"><Input name="startTime" type="time" defaultValue="10:00" /></Field>
                <Field label="Until" optional><Input name="endTime" type="time" /></Field>
              </div>
              <Field label="Where" optional><Input name="location" /></Field>
              <Field label="Leading" optional><Input name="leader" defaultValue={dept?.leaderName ?? ""} /></Field>
              <Field label="What is being given" optional className="sm:col-span-2"><Input name="whatIsGiven" placeholder="Food parcels and warm clothes" /></Field>
              <Field label="Households expected" optional><Input name="households" inputMode="numeric" /></Field>
              <Field label="Volunteers" optional><Input name="volunteers" /></Field>
              <Field label="Notes" optional className="sm:col-span-2"><Textarea name="notes" rows={2} /></Field>
              <div className="sm:col-span-2">
                <Button type="submit" variant="primary"><CalendarPlus size={15} /> Organise it</Button>
              </div>
            </form>
          </Card>
        ) : null}

        <Panel title="Help given lately" className="lg:col-span-2" empty="Nothing recorded yet.">
          {recent.map((g) => (
            <Row
              key={g.id}
              href={writable ? `/welfare/${g.id}` : undefined}
              title={`${welfareKindLabel(g.kind)} — ${who(g)}`}
              meta={[g.items, g.authorisedBy && `authorised by ${g.authorisedBy}`].filter(Boolean).join(" · ")}
              right={
                <span className={g.status === "PLANNED" ? "text-bronze-700 dark:text-bronze-300" : ""}>
                  {g.status === "PLANNED" ? "planned · " : g.status === "CANCELLED" ? "cancelled · " : ""}
                  {g.estimatedValue ? formatZAR(g.estimatedValue) : formatDate(g.date)}
                </span>
              }
            />
          ))}
        </Panel>
      </div>
    </div>
  );
}
