import { db } from "@/lib/db";
import { today } from "@/lib/demo";
import { financialYearBounds } from "@/lib/finance";
import { formatDate, enumLabel, firstName } from "@/lib/format";
import { KpiGrid, KpiTile } from "@/components/kpi";
import { PageHeader } from "@/components/ui";
import { Panel, Row } from "@/components/home/kit";
import { Award, CalendarDays, Inbox, Users } from "lucide-react";

/**
 * The secretary's desk.
 *
 * Everything here is a queue with a person waiting at the end of it: forms to
 * accept, certificates to issue, the week's diary, and the records that are
 * missing the details the register is supposed to hold.
 */
export async function SecretaryHome({ name }: { name: string }) {
  const now = today();
  const fy = financialYearBounds(now, 3);
  const weekEnd = new Date(now.getTime() + 7 * 864e5);

  const [waiting, held, thisWeek, certificates, recentMembers, incomplete, memberCount] =
    await Promise.all([
      db.membershipApplication.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        take: 8,
      }),
      db.membershipApplication.findMany({
        where: { status: "HELD_DUPLICATE" },
        orderBy: { createdAt: "asc" },
        include: { possibleDuplicateOf: { select: { fullName: true } } },
        take: 5,
      }),
      db.event.findMany({
        where: { deletedAt: null, startsAt: { gte: now, lte: weekEnd } },
        orderBy: { startsAt: "asc" },
      }),
      db.baptism.findMany({
        where: { deletedAt: null, status: "BAPTISED", certificateIssuedAt: null },
        orderBy: { baptismDate: "desc" },
        take: 8,
      }),
      db.member.findMany({
        where: { deletedAt: null },
        orderBy: { registrationDate: "desc" },
        select: { id: true, fullName: true, memberNumber: true, registrationDate: true },
        take: 6,
      }),
      db.member.findMany({
        where: {
          deletedAt: null,
          status: "ACTIVE",
          OR: [{ dob: null }, { AND: [{ phone: null }, { email: null }] }],
        },
        orderBy: { fullName: "asc" },
        select: { id: true, fullName: true, dob: true, phone: true, email: true },
        take: 8,
      }),
      db.member.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    ]);

  return (
    <div className="mx-auto max-w-[1200px] 2xl:max-w-[1500px]">
      <PageHeader
        title={`Good day, ${firstName(name)}`}
        description={`The office · financial year ${fy.label}`}
      />

      <KpiGrid>
        <KpiTile label="Forms waiting" value={String(waiting.length + held.length)} comparison={held.length ? `${held.length} held as possible duplicates` : "nothing held"} icon={<Inbox size={15} />} accent />
        <KpiTile label="Certificates to issue" value={String(certificates.length)} comparison="baptised, not yet issued" icon={<Award size={15} />} />
        <KpiTile label="On this week" value={String(thisWeek.length)} comparison="services and meetings" icon={<CalendarDays size={15} />} />
        <KpiTile label="Active members" value={String(memberCount)} comparison="on the register" icon={<Users size={15} />} />
      </KpiGrid>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Panel title="Forms to accept" href="/applications" empty="Nothing waiting.">
          {waiting.map((a) => (
            <Row
              key={a.id}
              href={`/applications/${a.id}`}
              title={a.fullName}
              meta={[a.phone, a.city].filter(Boolean).join(" · ") || "no contact details"}
              right={formatDate(a.createdAt)}
            />
          ))}
        </Panel>

        <Panel title="Held — may already be members" href="/applications" empty="Nothing held.">
          {held.map((a) => (
            <Row
              key={a.id}
              href={`/applications/${a.id}`}
              title={a.fullName}
              meta={`${a.duplicateReason} as ${a.possibleDuplicateOf?.fullName ?? "an existing member"}`}
              right={formatDate(a.createdAt)}
              tone="warning"
            />
          ))}
        </Panel>

        <Panel title="Certificates to issue" href="/baptisms" empty="Every baptism has its certificate.">
          {certificates.map((b) => (
            <Row
              key={b.id}
              href={`/baptisms/${b.id}`}
              title={b.fullName}
              meta={b.baptismDate ? `baptised ${formatDate(b.baptismDate)}` : undefined}
            />
          ))}
        </Panel>

        <Panel title="This week" href="/planner" empty="Nothing on for the next seven days.">
          {thisWeek.map((e) => (
            <Row
              key={e.id}
              title={e.title}
              meta={[enumLabel(e.category), e.location].filter(Boolean).join(" · ")}
              right={formatDate(e.startsAt)}
            />
          ))}
        </Panel>

        <Panel
          title="Records missing details"
          subtitle="No date of birth, or no way to contact them"
          href="/members"
          empty="Every active record is complete."
        >
          {incomplete.map((m) => (
            <Row
              key={m.id}
              href={`/members/${m.id}`}
              title={m.fullName}
              meta={!m.dob ? "no date of birth" : "no telephone or email"}
              tone="warning"
            />
          ))}
        </Panel>

        <Panel title="Lately added" href="/members" empty="Nobody on the register yet.">
          {recentMembers.map((m) => (
            <Row
              key={m.id}
              href={`/members/${m.id}`}
              title={m.fullName}
              meta={m.memberNumber}
              right={formatDate(m.registrationDate)}
            />
          ))}
        </Panel>
      </div>
    </div>
  );
}
