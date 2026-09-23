import { db } from "@/lib/db";
import { today } from "@/lib/demo";
import { financialYearBounds, fundBalances, incomeExpenseTotals } from "@/lib/finance";
import { formatZARCompact, formatDate, enumLabel, firstName } from "@/lib/format";
import { KpiGrid, KpiTile } from "@/components/kpi";
import { PageHeader } from "@/components/ui";
import { Panel, Row } from "@/components/home/kit";
import { CalendarDays, Droplets, Users } from "lucide-react";

/**
 * The pastor's desk.
 *
 * Oversight, not administration: what is happening this week, who needs
 * visiting, what is in the notebook, and one quiet line of finance so the
 * pastor is never surprised in a council meeting. Nothing here changes a
 * record except the notebook.
 */
export async function PastorHome({ name }: { name: string }) {
  const now = today();
  const fy = financialYearBounds(now, 3);
  const weekEnd = new Date(now.getTime() + 7 * 864e5);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [thisWeek, pinnedNotes, recentNotes, toBaptise, newMembers, birthdays, attendance, fyTotals, funds, memberCount] =
    await Promise.all([
      db.event.findMany({
        where: { deletedAt: null, startsAt: { gte: now, lte: weekEnd } },
        orderBy: { startsAt: "asc" },
      }),
      db.pastoralNote.findMany({
        where: { deletedAt: null, pinned: true },
        orderBy: { noteDate: "desc" },
        take: 4,
      }),
      db.pastoralNote.findMany({
        where: { deletedAt: null, pinned: false },
        orderBy: { noteDate: "desc" },
        take: 5,
      }),
      db.baptism.findMany({
        where: { deletedAt: null, status: "APPROVED" },
        orderBy: { createdAt: "asc" },
        take: 6,
      }),
      db.member.findMany({
        where: { deletedAt: null, registrationDate: { gte: monthStart } },
        orderBy: { registrationDate: "desc" },
        select: { id: true, fullName: true, registrationDate: true, phone: true },
        take: 8,
      }),
      db.member.findMany({
        where: { deletedAt: null, status: "ACTIVE", dob: { not: null } },
        select: { id: true, fullName: true, dob: true },
      }),
      db.attendanceRegister.findMany({ orderBy: { serviceDate: "desc" }, take: 8 }),
      incomeExpenseTotals({ start: fy.start, end: fy.end }),
      fundBalances({ start: fy.start, end: fy.end }),
      db.member.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    ]);

  const soon = birthdays
    .map((m) => {
      const d = m.dob!;
      const next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
      if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        next.setFullYear(now.getFullYear() + 1);
      }
      return { ...m, next, days: Math.round((next.getTime() - now.getTime()) / 864e5) };
    })
    .filter((m) => m.days >= 0 && m.days <= 7)
    .sort((a, b) => a.days - b.days)
    .slice(0, 6);

  const avgAttendance = attendance.length
    ? Math.round(attendance.reduce((s, a) => s + (a.headcount ?? 0), 0) / attendance.length)
    : 0;
  const totalFunds = funds.reduce((s, f) => s + f.closing, 0);

  return (
    <div className="mx-auto max-w-[1200px] 2xl:max-w-[1500px]">
      <PageHeader
        title={`Good day, ${firstName(name)}`}
        description={`The congregation this week · financial year ${fy.label}`}
      />

      <KpiGrid>
        <KpiTile label="Active members" value={String(memberCount)} comparison={`${newMembers.length} joined this month`} icon={<Users size={15} />} />
        <KpiTile label="Average attendance" value={String(avgAttendance)} comparison="last 8 services" icon={<Users size={15} />} accent />
        <KpiTile label="Waiting to be baptised" value={String(toBaptise.length)} comparison="approved candidates" icon={<Droplets size={15} />} />
        <KpiTile label="Church funds" value={formatZARCompact(totalFunds)} comparison={`${formatZARCompact(fyTotals.net)} surplus this year`} icon={<CalendarDays size={15} />} />
      </KpiGrid>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Panel title="This week" subtitle="Services, meetings and everything else on" href="/planner" empty="Nothing on the calendar for the next seven days.">
          {thisWeek.map((e) => (
            <Row
              key={e.id}
              title={e.title}
              meta={[enumLabel(e.category), e.location].filter(Boolean).join(" · ")}
              right={formatDate(e.startsAt)}
            />
          ))}
        </Panel>

        <Panel title="Pinned in the notebook" href="/notes" hrefLabel="Open the notebook" empty="Nothing pinned.">
          {pinnedNotes.map((n) => (
            <Row
              key={n.id}
              href={`/notes/${n.id}`}
              title={n.title}
              meta={n.confidential ? "Confidential" : enumLabel(n.category)}
              right={formatDate(n.noteDate)}
            />
          ))}
        </Panel>

        <Panel title="To welcome" subtitle="Joined this month" href="/members" empty="Nobody new this month.">
          {newMembers.map((m) => (
            <Row key={m.id} href={`/members/${m.id}`} title={m.fullName} meta={m.phone ?? "no telephone"} right={formatDate(m.registrationDate)} />
          ))}
        </Panel>

        <Panel title="Birthdays this week" href="/members" empty="No birthdays in the next seven days.">
          {soon.map((m) => (
            <Row
              key={m.id}
              href={`/members/${m.id}`}
              title={m.fullName}
              right={m.days === 0 ? "today" : m.days === 1 ? "tomorrow" : formatDate(m.next)}
            />
          ))}
        </Panel>

        <Panel title="Waiting on you to baptise" href="/baptisms" empty="Nobody is waiting.">
          {toBaptise.map((b) => (
            <Row key={b.id} href={`/baptisms/${b.id}`} title={b.fullName} meta={`${b.programmeYear} programme`} />
          ))}
        </Panel>

        <Panel title="Lately in the notebook" href="/notes" hrefLabel="Write a note" empty="The notebook is empty.">
          {recentNotes.map((n) => (
            <Row
              key={n.id}
              href={`/notes/${n.id}`}
              title={n.title}
              meta={n.confidential ? "Confidential" : enumLabel(n.category)}
              right={formatDate(n.noteDate)}
            />
          ))}
        </Panel>
      </div>
    </div>
  );
}
