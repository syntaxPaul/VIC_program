import Link from "next/link";
import { db } from "@/lib/db";
import { today } from "@/lib/demo";
import { financialYearBounds } from "@/lib/finance";
import { formatDate, firstName } from "@/lib/format";
import { KpiGrid, KpiTile } from "@/components/kpi";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { Panel, Row, Stage } from "@/components/home/kit";
import { ClipboardCheck, Droplets, GraduationCap } from "lucide-react";

const WEEKS = 7 * 864e5;

/**
 * The discipleship leader's desk.
 *
 * Their work is a road: somebody enquires, joins a class, is approved, is
 * baptised. The screen is that road, with the people standing on each part of
 * it, and it puts the ones who have stalled at the top — a candidate who
 * started class three months ago and is still "in class" is the whole job.
 */
export async function DiscipleshipHome({ name }: { name: string }) {
  const now = today();
  const fy = financialYearBounds(now, 3);

  const [candidates, inClass, approved, baptisedThisYear, registers, unbaptisedMembers, upcoming, children, youth, welfareDays, welfarePlanned, consecrations] =
    await Promise.all([
      db.baptism.findMany({
        where: { deletedAt: null, status: "CANDIDATE" },
        orderBy: { createdAt: "desc" },
      }),
      db.baptism.findMany({
        where: { deletedAt: null, status: "CLASS_IN_PROGRESS" },
        orderBy: { classStartDate: "asc" },
      }),
      db.baptism.findMany({
        where: { deletedAt: null, status: "APPROVED" },
        orderBy: { createdAt: "asc" },
      }),
      db.baptism.count({
        where: { deletedAt: null, status: "BAPTISED", baptismDate: { gte: fy.start, lte: fy.end } },
      }),
      db.attendanceRegister.findMany({ orderBy: { serviceDate: "desc" }, take: 6 }),
      db.member.findMany({
        where: {
          deletedAt: null,
          status: "ACTIVE",
          baptismDate: null,
          registrationDate: { gte: new Date(now.getTime() - 365 * 864e5) },
        },
        orderBy: { registrationDate: "desc" },
        select: { id: true, fullName: true, registrationDate: true, phone: true },
        take: 8,
      }),
      db.event.findMany({
        where: { deletedAt: null, category: "BAPTISM", startsAt: { gte: now } },
        orderBy: { startsAt: "asc" },
        take: 4,
      }),
      db.childrensActivity.findMany({ where: { deletedAt: null, startsAt: { gte: now } }, orderBy: { startsAt: "asc" }, take: 4 }),
      db.youthMeeting.findMany({ where: { deletedAt: null, startsAt: { gte: now } }, orderBy: { startsAt: "asc" }, take: 5 }),
      db.event.findMany({ where: { deletedAt: null, category: "WELFARE", startsAt: { gte: now } }, orderBy: { startsAt: "asc" }, take: 3 }),
      db.welfareGrant.count({ where: { deletedAt: null, status: "PLANNED" } }),
      db.consecration.findMany({ where: { deletedAt: null, status: { in: ["REQUESTED", "SCHEDULED"] } }, orderBy: { createdAt: "asc" }, take: 5 }),
    ]);

  // Eight weeks is a full course here, so anything longer has stalled.
  const stalled = inClass.filter(
    (b) => b.classStartDate && now.getTime() - b.classStartDate.getTime() > 8 * WEEKS,
  );

  const avgAttendance = registers.length
    ? Math.round(registers.reduce((s, r) => s + (r.headcount ?? 0), 0) / registers.length)
    : 0;

  const weeksIn = (d: Date | null) =>
    d ? `${Math.max(0, Math.round((now.getTime() - d.getTime()) / WEEKS))} weeks in class` : "no start date recorded";

  return (
    <div className="mx-auto max-w-[1200px] 2xl:max-w-[1500px]">
      <PageHeader
        title={`Good day, ${firstName(name)}`}
        description="Discipleship — new believers, children, youth, and care for those in need."
      />

      <KpiGrid>
        <KpiTile label="In class now" value={String(inClass.length)} comparison={`${stalled.length} running long`} icon={<GraduationCap size={15} />} accent />
        <KpiTile label="Waiting to be baptised" value={String(approved.length)} comparison="approved and ready" icon={<Droplets size={15} />} />
        <KpiTile label="Baptised this year" value={String(baptisedThisYear)} comparison={fy.label} icon={<Droplets size={15} />} />
        <KpiTile label="Average attendance" value={String(avgAttendance)} comparison="last 6 services" icon={<ClipboardCheck size={15} />} />
      </KpiGrid>

      <Card className="mt-4">
        <CardHeader title="The road to baptism" subtitle="Everyone currently on it — tap a stage to work through it" />
        <div className="flex flex-wrap gap-3 p-5">
          <Stage label="Enquired" count={candidates.length} href="/baptisms?status=CANDIDATE" />
          <Stage label="In class" count={inClass.length} href="/baptisms?status=CLASS_IN_PROGRESS" accent />
          <Stage label="Approved" count={approved.length} href="/baptisms?status=APPROVED" />
          <Stage label={`Baptised ${fy.label}`} count={baptisedThisYear} href="/baptisms?status=BAPTISED" />
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["/children", "Children's church", children[0] ? `next ${formatDate(children[0].startsAt)}` : "nothing planned"],
          ["/youth", "Youth", youth[0] ? `next ${formatDate(youth[0].startsAt)}` : "nothing planned"],
          ["/welfare", "Health & welfare", welfarePlanned ? `${welfarePlanned} to give` : "nothing pending"],
          ["/consecrations", "Consecrations", consecrations.length ? `${consecrations.length} waiting` : "none waiting"],
        ].map(([href, label, note]) => (
          <Link key={href} href={href} className="rounded-xl border bg-[var(--card)] px-4 py-3 transition-colors hover:border-bronze-300">
            <p className="text-[13.5px] font-medium">{label}</p>
            <p className="text-[12px] text-[var(--text-muted)]">{note}</p>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Panel title="Children's church coming up" href="/children" empty="Nothing planned.">
          {children.map((a) => (
            <Row key={a.id} href={`/children/${a.id}`} title={a.title} meta={[a.leader, a.location].filter(Boolean).join(" · ")} right={formatDate(a.startsAt)} />
          ))}
        </Panel>

        <Panel title="Youth coming up" href="/youth" empty="Nothing planned.">
          {youth.map((m) => (
            <Row key={m.id} href={`/youth/${m.id}`} title={m.title} meta={[m.division.replace("_", " ").toLowerCase(), m.scripture].filter(Boolean).join(" · ")} right={formatDate(m.startsAt)} />
          ))}
        </Panel>

        <Panel title="Welfare distribution days" href="/welfare" empty="None organised.">
          {welfareDays.map((d) => (
            <Row key={d.id} href={`/welfare/days/${d.id}`} title={d.title} meta={d.location ?? undefined} right={formatDate(d.startsAt)} />
          ))}
        </Panel>

        <Panel title="Consecrations to arrange" href="/consecrations" empty="No families waiting.">
          {consecrations.map((c) => (
            <Row key={c.id} href={`/consecrations/${c.id}`} title={c.childName} meta={c.status === "SCHEDULED" ? "date set" : "requested"} right={c.consecrationDate ? formatDate(c.consecrationDate) : undefined} />
          ))}
        </Panel>

        <Panel
          title="Running long"
          subtitle="In class more than eight weeks"
          href="/baptisms"
          empty="Nobody has been in class too long."
        >
          {stalled.map((b) => (
            <Row
              key={b.id}
              href={`/baptisms/${b.id}`}
              title={b.fullName}
              meta={weeksIn(b.classStartDate)}
              tone="warning"
            />
          ))}
        </Panel>

        <Panel
          title="Ready to be baptised"
          subtitle="Approved, waiting for a service"
          href="/baptisms"
          empty="Nobody is waiting."
        >
          {approved.map((b) => (
            <Row key={b.id} href={`/baptisms/${b.id}`} title={b.fullName} meta={`${b.programmeYear} programme`} />
          ))}
        </Panel>

        <Panel
          title="Currently in class"
          href="/baptisms"
          empty="No class is running."
        >
          {inClass.map((b) => (
            <Row
              key={b.id}
              href={`/baptisms/${b.id}`}
              title={b.fullName}
              meta={weeksIn(b.classStartDate)}
              right={b.classStartDate ? formatDate(b.classStartDate) : undefined}
            />
          ))}
        </Panel>

        <Panel
          title="Members not yet baptised"
          subtitle="Joined in the last year — the next class"
          href="/members"
          empty="Everyone who joined this year has been baptised."
        >
          {unbaptisedMembers.map((m) => (
            <Row
              key={m.id}
              href={`/members/${m.id}`}
              title={m.fullName}
              meta={m.phone ?? "no telephone on the register"}
              right={formatDate(m.registrationDate)}
            />
          ))}
        </Panel>

        <Panel title="Baptism services coming up" href="/planner" empty="None on the calendar yet.">
          {upcoming.map((e) => (
            <Row key={e.id} title={e.title} meta={e.location ?? undefined} right={formatDate(e.startsAt)} />
          ))}
        </Panel>

        <Panel title="Recent registers" href="/attendance" empty="No registers taken yet.">
          {registers.map((r) => (
            <Row
              key={r.id}
              href={`/attendance/${r.id}`}
              title={r.serviceName}
              meta={formatDate(r.serviceDate)}
              right={r.headcount ? `${r.headcount} present` : undefined}
            />
          ))}
        </Panel>
      </div>
    </div>
  );
}
