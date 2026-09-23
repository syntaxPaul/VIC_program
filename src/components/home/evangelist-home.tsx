import { db } from "@/lib/db";
import { today } from "@/lib/demo";
import { financialYearBounds } from "@/lib/finance";
import { formatDate, firstName } from "@/lib/format";
import { KpiGrid, KpiTile } from "@/components/kpi";
import { PageHeader } from "@/components/ui";
import { Panel, Row } from "@/components/home/kit";
import { outreachKindLabel } from "@/lib/outreach-labels";
import { Inbox, PhoneOff, UserPlus } from "lucide-react";

/**
 * The evangelist's desk.
 *
 * Outreach brings people in; the work is making sure none of them is dropped
 * afterwards. So this screen is a follow-up list first — who arrived, how to
 * reach them, and who cannot be reached at all, which is the failure this
 * office exists to prevent.
 */
export async function EvangelistHome({ name }: { name: string }) {
  const now = today();
  const fy = financialYearBounds(now, 3);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 864e5);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [waitingForms, formsThisMonth, recent, joinedThisYear, unreachable, interested, planned, results] =
    await Promise.all([
      db.membershipApplication.findMany({
        where: { status: { in: ["PENDING", "HELD_DUPLICATE"] } },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      db.membershipApplication.count({ where: { createdAt: { gte: monthStart } } }),
      db.member.findMany({
        where: { deletedAt: null, registrationDate: { gte: sixtyDaysAgo } },
        orderBy: { registrationDate: "desc" },
        select: { id: true, fullName: true, phone: true, city: true, registrationDate: true },
        take: 10,
      }),
      db.member.count({ where: { deletedAt: null, registrationDate: { gte: fy.start } } }),
      db.member.findMany({
        where: {
          deletedAt: null,
          status: "ACTIVE",
          phone: null,
          email: null,
          registrationDate: { gte: new Date(now.getTime() - 365 * 864e5) },
        },
        orderBy: { registrationDate: "desc" },
        select: { id: true, fullName: true, registrationDate: true },
        take: 8,
      }),
      db.memberInterest.findMany({
        where: { interest: { name: { contains: "Outreach", mode: "insensitive" } } },
        include: { member: { select: { id: true, fullName: true, phone: true } } },
        take: 8,
      }),
      db.outreach.findMany({
        where: { deletedAt: null, status: "PLANNED" },
        orderBy: { startsAt: "asc" },
        take: 6,
      }),
      db.outreach.aggregate({
        where: { deletedAt: null, status: "DONE", startsAt: { gte: fy.start, lte: fy.end } },
        _count: true,
        _sum: { peopleReached: true, decisions: true, followUpsDue: true },
      }),
    ]);

  return (
    <div className="mx-auto max-w-[1200px] 2xl:max-w-[1500px]">
      <PageHeader
        title={`Good day, ${firstName(name)}`}
        description="Evangelism — outreach, and the people it brings in."
      />

      <KpiGrid>
        <KpiTile label="Forms this month" value={String(formsThisMonth)} comparison="from the public link" icon={<Inbox size={15} />} accent />
        <KpiTile label="Joined in 60 days" value={String(recent.length)} comparison="to follow up" icon={<UserPlus size={15} />} />
        <KpiTile label="Joined this year" value={String(joinedThisYear)} comparison={fy.label} icon={<UserPlus size={15} />} />
        <KpiTile label="Cannot be reached" value={String(unreachable.length)} comparison="no phone, no email" icon={<PhoneOff size={15} />} />
      </KpiGrid>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Panel
          title="Follow up"
          subtitle="Joined in the last sixty days"
          href="/members"
          empty="Nobody new in the last two months."
        >
          {recent.map((m) => (
            <Row
              key={m.id}
              href={`/members/${m.id}`}
              title={m.fullName}
              meta={[m.phone, m.city].filter(Boolean).join(" · ") || "no contact details"}
              right={formatDate(m.registrationDate)}
            />
          ))}
        </Panel>

        <Panel
          title="Forms waiting"
          subtitle="The secretary accepts these; you can see who is coming"
          href="/applications"
          empty="No forms waiting."
        >
          {waitingForms.map((a) => (
            <Row
              key={a.id}
              href={`/applications/${a.id}`}
              title={a.fullName}
              meta={[a.phone, a.city].filter(Boolean).join(" · ") || "no contact details"}
              right={formatDate(a.createdAt)}
            />
          ))}
        </Panel>

        <Panel
          title="No way to reach them"
          subtitle="On the register with neither a phone number nor an email"
          href="/members"
          empty="Everyone who joined this year can be contacted."
        >
          {unreachable.map((m) => (
            <Row
              key={m.id}
              href={`/members/${m.id}`}
              title={m.fullName}
              meta="add a telephone number when you next see them"
              right={formatDate(m.registrationDate)}
              tone="warning"
            />
          ))}
        </Panel>

        <Panel
          title="Outreaches planned"
          subtitle={`This year: ${results._count} done · ${results._sum.peopleReached ?? 0} reached · ${results._sum.decisions ?? 0} decisions`}
          href="/outreach"
          hrefLabel="Plan one"
          empty="Nothing planned — plan the next one."
        >
          {planned.map((o) => (
            <Row
              key={o.id}
              href={`/outreach/${o.id}`}
              title={o.title}
              meta={[outreachKindLabel(o.kind), o.area ?? o.location].filter(Boolean).join(" · ")}
              right={formatDate(o.startsAt)}
            />
          ))}
        </Panel>

        <Panel
          title="Members who volunteered for outreach"
          subtitle="Your team on the ground"
          href="/ministries"
          empty="Nobody has put their name down yet."
          className="lg:col-span-2"
        >
          {interested.map((i) => (
            <Row
              key={`${i.memberId}-${i.interestId}`}
              href={`/members/${i.member.id}`}
              title={i.member.fullName}
              meta={i.member.phone ?? "no telephone"}
            />
          ))}
        </Panel>
      </div>
    </div>
  );
}
