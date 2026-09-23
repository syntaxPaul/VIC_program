import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Cake, Droplets, Mail, MapPin, Pencil, Phone, Church, HandCoins, Heart,
} from "lucide-react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { financialYearBounds } from "@/lib/finance";
import { today } from "@/lib/demo";
import { formatDate, formatZAR, enumLabel, initials } from "@/lib/format";
import { Badge, Button, Card, CardHeader, PageHeader, TableWrap, Td, Th } from "@/components/ui";

export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const fy = financialYearBounds(today(), 3);

  const member = await db.member.findFirst({
    where: { id, deletedAt: null },
    include: {
      ministries: { include: { ministry: true } },
      interests: { include: { interest: true } },
      baptisms: true,
      attendance: {
        where: { present: true },
        include: { register: true },
        orderBy: { register: { serviceDate: "desc" } },
        take: 12,
      },
      contributions: {
        where: { batch: { status: "POSTED", serviceDate: { gte: fy.start, lte: fy.end } } },
        include: { fund: true, batch: true },
        orderBy: { batch: { serviceDate: "desc" } },
        take: 10,
      },
    },
  });

  if (!member) notFound();

  // A household here often shares one telephone. That is not an error to be
  // corrected — but whoever phones should know whose number they are dialling.
  const sharesNumber = member.phone
    ? await db.member.findMany({
        where: { deletedAt: null, phone: member.phone, id: { not: member.id } },
        select: { id: true, fullName: true },
        take: 8,
      })
    : [];

  const givingTotal = await db.contributionLine.aggregate({
    where: {
      memberId: id,
      batch: { status: "POSTED", serviceDate: { gte: fy.start, lte: fy.end } },
    },
    _sum: { amount: true },
    _count: true,
  });

  const canSeeGiving =
    session?.role === "ADMIN" || session?.role === "TREASURER" || session?.role === "PASTOR";

  const age = member.dob
    ? Math.floor((today().getTime() - member.dob.getTime()) / (365.25 * 86400000))
    : null;

  return (
    <div className="mx-auto max-w-[1400px] 2xl:max-w-[1760px]">
      <PageHeader
        title={member.fullName}
        description={`${member.memberNumber} · Registered ${formatDate(member.registrationDate)}`}
        actions={
          <Link href={`/members/${member.id}/edit`}>
            <Button variant="primary">
              <Pencil size={15} /> Edit
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="flex flex-wrap items-start gap-5 p-5">
              {member.photoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/photo/${member.photoPath}`}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-full border object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-bronze-600 text-xl font-semibold text-white">
                  {initials(member.fullName)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h2 className="text-[17px] font-semibold">{member.fullName}</h2>
                  <Badge
                    tone={
                      member.status === "ACTIVE"
                        ? "success"
                        : member.status === "INACTIVE"
                          ? "neutral"
                          : "warning"
                    }
                  >
                    {enumLabel(member.status)}
                  </Badge>
                </div>
                <dl className="grid gap-x-6 gap-y-2 text-[13.5px] sm:grid-cols-2">
                  <Detail
                    icon={<Phone size={14} />}
                    value={
                      member.phone ? (
                        <span>
                          {member.phone}
                          {sharesNumber.length ? (
                            <span className="text-[var(--text-muted)]">
                              {" "}· shared with{" "}
                              {sharesNumber.map((o, i) => (
                                <span key={o.id}>
                                  {i > 0 ? ", " : ""}
                                  <Link href={`/members/${o.id}`} className="hover:underline">
                                    {o.fullName}
                                  </Link>
                                </span>
                              ))}
                            </span>
                          ) : null}
                        </span>
                      ) : null
                    }
                  />
                  <Detail icon={<Mail size={14} />} value={member.email} />
                  <Detail
                    icon={<MapPin size={14} />}
                    value={
                      [member.addressLine, member.city, member.province]
                        .filter(Boolean)
                        .join(", ") || null
                    }
                  />
                  <Detail
                    icon={<Cake size={14} />}
                    value={member.dob ? `${formatDate(member.dob)}${age ? ` · ${age} years` : ""}` : null}
                  />
                </dl>
              </div>
            </div>

            <div className="grid grid-cols-2 border-t sm:grid-cols-4">
              <Stat label="Gender" value={enumLabel(member.gender)} />
              <Stat label="Marital status" value={enumLabel(member.maritalStatus)} />
              <Stat label="Children" value={member.children ?? "—"} />
              <Stat label="Postal code" value={member.postalCode ?? "—"} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Church life" />
            <div className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
              <LabelValue
                icon={<Church size={14} />}
                label="Date of salvation"
                value={formatDate(member.salvationDate)}
              />
              <LabelValue
                icon={<Droplets size={14} />}
                label="Date of baptism"
                value={formatDate(member.baptismDate)}
              />
              <LabelValue label="Previous church" value={member.previousChurch ?? "—"} />
              <LabelValue
                label="Previous church location"
                value={member.previousChurchLocation ?? "—"}
              />
            </div>

            {(member.ministries.length > 0 || member.interests.length > 0) && (
              <div className="space-y-3 border-t p-5">
                {member.ministries.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[12px] font-semibold tracking-wide text-[var(--text-muted)] uppercase">
                      Ministries
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {member.ministries.map((m) => (
                        <Badge key={m.ministryId} tone="brand">{m.ministry.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {member.interests.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[12px] font-semibold tracking-wide text-[var(--text-muted)] uppercase">
                      Areas of interest
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {member.interests.map((i) => (
                        <Badge key={i.interestId}>{i.interest.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {canSeeGiving && member.contributions.length > 0 ? (
            <Card>
              <CardHeader
                title="Recent giving"
                subtitle={`Financial year ${fy.label}`}
                action={
                  <Link
                    href={`/reports/donor-statement?member=${member.id}`}
                    className="text-[13px] font-medium text-bronze-600 hover:underline dark:text-bronze-300"
                  >
                    Statement
                  </Link>
                }
              />
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Fund</Th>
                    <Th>Method</Th>
                    <Th numeric>Amount</Th>
                  </tr>
                </thead>
                <tbody>
                  {member.contributions.map((c) => (
                    <tr key={c.id}>
                      <Td label="Date" className="tnum">{formatDate(c.batch.serviceDate)}</Td>
                      <Td label="Fund">{c.fund.name}</Td>
                      <Td label="Method" className="text-[var(--text-muted)]">{enumLabel(c.method)}</Td>
                      <Td label="Amount" numeric className="font-medium">{formatZAR(c.amount)}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          {canSeeGiving ? (
            <Card>
              <CardHeader title="Giving this year" />
              <div className="p-5">
                <p className="tnum text-[26px] leading-none font-semibold">
                  {formatZAR(givingTotal._sum.amount ?? 0)}
                </p>
                <p className="mt-2 text-[13px] text-[var(--text-muted)]">
                  Across {givingTotal._count} contributions · FY {fy.label}
                </p>
              </div>
            </Card>
          ) : null}

          {member.baptisms.length > 0 ? (
            <Card>
              <CardHeader title="Baptism record" />
              <ul className="divide-y">
                {member.baptisms.map((b) => (
                  <li key={b.id} className="px-5 py-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-[13.5px] font-medium">{b.programmeYear} programme</span>
                      <Badge tone={b.status === "BAPTISED" ? "success" : "info"}>
                        {enumLabel(b.status)}
                      </Badge>
                    </div>
                    {b.baptismDate ? (
                      <p className="text-[12.5px] text-[var(--text-muted)]">
                        {formatDate(b.baptismDate)} · {b.officiant}
                      </p>
                    ) : null}
                    {b.registerNumber ? (
                      <Link
                        href={`/baptisms/${b.id}/certificate`}
                        className="mt-1.5 inline-block text-[12.5px] font-medium text-bronze-600 hover:underline dark:text-bronze-300"
                      >
                        View certificate →
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {member.attendance.length > 0 ? (
            <Card>
              <CardHeader
                title="Recent attendance"
                subtitle={`Present at ${member.attendance.length} of the last services recorded`}
              />
              <ul className="divide-y">
                {member.attendance.slice(0, 6).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-2.5 px-5 py-2.5 text-[13px]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    <span className="flex-1 truncate">{a.register.serviceName}</span>
                    <span className="tnum text-[12px] text-[var(--text-muted)]">
                      {formatDate(a.register.serviceDate)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {member.prayerRequests ? (
            <Card>
              <CardHeader title="Prayer requests" />
              <p className="p-5 text-[13.5px] leading-relaxed whitespace-pre-wrap">
                {member.prayerRequests}
              </p>
            </Card>
          ) : null}

          {member.notes ? (
            <Card>
              <CardHeader title="Notes" subtitle="Office use" />
              <p className="p-5 text-[13.5px] leading-relaxed whitespace-pre-wrap text-[var(--text-muted)]">
                {member.notes}
              </p>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Detail({
  icon,
  value,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-[var(--text-muted)]">
      {icon}
      <span className="truncate text-[var(--text)]">{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r px-5 py-3 last:border-r-0">
      <p className="text-[11.5px] tracking-wide text-[var(--text-muted)] uppercase">{label}</p>
      <p className="mt-0.5 text-[13.5px] font-medium">{value}</p>
    </div>
  );
}

function LabelValue({
  icon, label, value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[12px] tracking-wide text-[var(--text-muted)] uppercase">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-[13.5px]">{value}</p>
    </div>
  );
}
