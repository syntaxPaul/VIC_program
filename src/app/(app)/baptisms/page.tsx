import Link from "next/link";
import { Droplets, Plus, Award } from "lucide-react";
import { db } from "@/lib/db";
import { today } from "@/lib/demo";
import { formatDate, enumLabel } from "@/lib/format";
import {
  Badge, Button, Card, CardHeader, EmptyState, PageHeader,
  TableWrap, Td, Th,
} from "@/components/ui";

const TONE = {
  CANDIDATE: "neutral",
  CLASS_IN_PROGRESS: "info",
  APPROVED: "warning",
  BAPTISED: "success",
  WITHDRAWN: "neutral",
} as const;

export default async function BaptismsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const sp = await searchParams;
  const year = parseInt(sp.year ?? "", 10) || today().getFullYear();

  const [records, years] = await Promise.all([
    db.baptism.findMany({
      where: { deletedAt: null, programmeYear: year },
      include: { member: true },
      orderBy: [{ status: "asc" }, { fullName: "asc" }],
    }),
    db.baptism.findMany({
      where: { deletedAt: null },
      select: { programmeYear: true },
      distinct: ["programmeYear"],
      orderBy: { programmeYear: "desc" },
    }),
  ]);

  const counts = {
    total: records.length,
    baptised: records.filter((r) => r.status === "BAPTISED").length,
    pending: records.filter((r) => ["CANDIDATE", "CLASS_IN_PROGRESS", "APPROVED"].includes(r.status)).length,
    certificates: records.filter((r) => r.certificateIssuedAt).length,
  };

  return (
    <div className="mx-auto max-w-[1300px]">
      <PageHeader
        title="Baptism programme"
        description={`${year} programme · ${counts.baptised} baptised, ${counts.pending} in progress`}
        actions={
          <Link href="/baptisms/new">
            <Button variant="primary"><Plus size={15} /> Add candidate</Button>
          </Link>
        }
      />

      {years.length > 1 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {years.map((y) => (
            <Link key={y.programmeYear} href={`/baptisms?year=${y.programmeYear}`}>
              <Button variant={y.programmeYear === year ? "secondary" : "ghost"} size="sm">
                {y.programmeYear}
              </Button>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <MiniStat label="Candidates" value={counts.total} />
        <MiniStat label="Baptised" value={counts.baptised} tone="success" />
        <MiniStat label="In progress" value={counts.pending} tone="warning" />
        <MiniStat label="Certificates issued" value={counts.certificates} />
      </div>

      <Card className="overflow-hidden">
        <CardHeader title={`${year} register`} />
        {records.length === 0 ? (
          <EmptyState
            icon={<Droplets size={18} />}
            title={`No candidates for ${year} yet`}
            description="Add a candidate to begin this year's baptism programme."
            action={
              <Link href="/baptisms/new">
                <Button variant="primary"><Plus size={15} /> Add candidate</Button>
              </Link>
            }
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Register no.</Th>
                <Th>Status</Th>
                <Th>Baptism date</Th>
                <Th>Officiant</Th>
                <Th>Certificate</Th>
              </tr>
            </thead>
            <tbody>
              {records.map((b) => (
                <tr key={b.id} className="hover:bg-sand-50 dark:hover:bg-sand-800/40">
                  <Td label="Name">
                    <Link href={`/baptisms/${b.id}`} className="font-medium hover:underline">
                      {b.fullName}
                    </Link>
                    {b.member ? (
                      <span className="tnum block text-[12px] text-[var(--text-muted)]">
                        {b.member.memberNumber}
                      </span>
                    ) : null}
                  </Td>
                  <Td label="Register no." className="tnum text-[var(--text-muted)]">{b.registerNumber ?? "—"}</Td>
                  <Td label="Status"><Badge tone={TONE[b.status]}>{enumLabel(b.status)}</Badge></Td>
                  <Td label="Baptism date" className="tnum">{formatDate(b.baptismDate)}</Td>
                  <Td label="Officiant" className="text-[13px]">{b.officiant ?? "—"}</Td>
                  <Td label="Certificate">
                    {b.certificateIssuedAt ? (
                      <Link
                        href={`/baptisms/${b.id}/certificate`}
                        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-bronze-600 hover:underline dark:text-bronze-300"
                      >
                        <Award size={14} /> View
                      </Link>
                    ) : b.status === "BAPTISED" ? (
                      <span className="text-[12.5px] text-warning">Not issued</span>
                    ) : (
                      <span className="text-[12.5px] text-[var(--text-muted)]">—</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}

function MiniStat({
  label, value, tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "success" | "warning";
}) {
  const colors = { neutral: "", success: "text-success", warning: "text-warning" };
  return (
    <Card className="p-4">
      <p className="text-[12.5px] font-medium text-[var(--text-muted)]">{label}</p>
      <p className={`tnum mt-1.5 text-[24px] leading-none font-semibold ${colors[tone]}`}>{value}</p>
    </Card>
  );
}
