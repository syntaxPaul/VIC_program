import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate, enumLabel } from "@/lib/format";
import { issueCertificate } from "@/lib/actions/planner";
import { Badge, Button, Card, CardHeader, PageHeader } from "@/components/ui";

export default async function BaptismPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const b = await db.baptism.findFirst({
    where: { id, deletedAt: null },
    include: { member: true },
  });

  if (!b) notFound();

  const canIssue = b.status === "BAPTISED";

  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHeader
        title={b.fullName}
        description={`${b.programmeYear} baptism programme${b.registerNumber ? ` · Register ${b.registerNumber}` : ""}`}
        actions={
          <>
            <Link href={`/baptisms/${b.id}/edit`}>
              <Button><Pencil size={15} /> Edit</Button>
            </Link>
            {canIssue ? (
              b.certificateIssuedAt ? (
                <Link href={`/baptisms/${b.id}/certificate`}>
                  <Button variant="primary"><Award size={15} /> View certificate</Button>
                </Link>
              ) : (
                <form action={issueCertificate.bind(null, b.id)}>
                  <Button type="submit" variant="primary">
                    <Award size={15} /> Issue certificate
                  </Button>
                </form>
              )
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader title="Candidate" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <LV label="Status" value={enumLabel(b.status)} badge />
            <LV label="Member" value={b.member?.memberNumber ?? "Not a member"} />
            <LV label="Date of birth" value={formatDate(b.dob)} />
            <LV label="Place of birth" value={b.placeOfBirth ?? "—"} />
            <LV label="Parents" value={b.parentNames ?? "—"} />
            <LV label="Class started" value={formatDate(b.classStartDate)} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Baptism" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <LV label="Date" value={formatDate(b.baptismDate)} />
            <LV label="Place" value={b.placeOfBaptism ?? "—"} />
            <LV label="Mode" value={b.mode ?? "—"} />
            <LV label="Officiant" value={b.officiant ?? "—"} />
            <LV label="First witness" value={b.witness1 ?? "—"} />
            <LV label="Second witness" value={b.witness2 ?? "—"} />
            <LV label="Scripture" value={b.scriptureVerse ?? "—"} />
            <LV label="Register number" value={b.registerNumber ?? "Not yet assigned"} />
          </div>
        </Card>
      </div>

      {b.certificateIssuedAt ? (
        <Card className="mt-4">
          <div className="flex flex-wrap items-center gap-3 p-4">
            <Award size={18} className="text-bronze-500" />
            <p className="flex-1 text-[13.5px]">
              Certificate issued {formatDate(b.certificateIssuedAt)}
              {b.certificateIssuedBy ? ` by ${b.certificateIssuedBy}` : ""}
              {b.certificateReissueCount > 0
                ? ` · reissued ${b.certificateReissueCount} time${b.certificateReissueCount > 1 ? "s" : ""}`
                : ""}
            </p>
            <Link href={`/baptisms/${b.id}/certificate`}>
              <Button>View</Button>
            </Link>
            <form action={issueCertificate.bind(null, b.id)}>
              <Button type="submit" variant="ghost">Reissue duplicate</Button>
            </form>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function LV({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  return (
    <div>
      <p className="text-[11.5px] tracking-wide text-[var(--text-muted)] uppercase">{label}</p>
      {badge ? (
        <div className="mt-1"><Badge tone="info">{value}</Badge></div>
      ) : (
        <p className="mt-0.5 text-[13.5px]">{value}</p>
      )}
    </div>
  );
}
