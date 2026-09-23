import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Check, Merge, UserPlus, X } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate, enumLabel } from "@/lib/format";
import { can } from "@/lib/roles";
import { requireApplicationRead } from "@/lib/guards";
import {
  acceptApplication, declineApplication, mergeApplication, notADuplicate,
} from "@/lib/actions/applications";
import {
  Badge, Button, Card, CardHeader, PageHeader, Textarea,
} from "@/components/ui";

function Line({
  label, value, other, differs,
}: {
  label: string;
  value: React.ReactNode;
  other?: React.ReactNode;
  differs?: boolean;
}) {
  if (!value && !other) return null;
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 border-b px-5 py-2 text-[13.5px] last:border-0 sm:grid-cols-[150px_1fr_1fr]">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className={differs ? "font-medium text-bronze-700 dark:text-bronze-300" : ""}>
        {value || <span className="text-[var(--text-muted)]">—</span>}
      </span>
      {other !== undefined ? (
        <span className="hidden text-[var(--text-muted)] sm:block">
          {other || "—"}
        </span>
      ) : null}
    </div>
  );
}

export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireApplicationRead();
  const { id } = await params;
  const writable = can(session.role, "applications", true);

  const a = await db.membershipApplication.findFirst({
    where: { id },
    include: { possibleDuplicateOf: true },
  });
  if (!a) notFound();

  const m = a.possibleDuplicateOf;
  const done = a.status === "ACCEPTED" || a.status === "MERGED" || a.status === "DECLINED";

  const d = (x: Date | null) => (x ? formatDate(x) : null);

  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeader
        title={a.fullName}
        description={`Membership form received ${formatDate(a.createdAt)}`}
        actions={
          done ? (
            <Badge tone={a.status === "DECLINED" ? "neutral" : "success"}>
              {a.status === "ACCEPTED" ? "Added to the register" : a.status === "MERGED" ? "Merged" : "Declined"}
              {a.reviewedBy ? ` by ${a.reviewedBy}` : ""}
            </Badge>
          ) : null
        }
      />

      {m && !done ? (
        <Card className="mb-4 border-warning/40">
          <div className="flex items-start gap-3 px-5 py-4">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" />
            <div className="text-[13.5px] leading-relaxed">
              <p className="font-medium">Held — this may already be {m.fullName}.</p>
              <p className="text-[var(--text-muted)]">
                {a.duplicateReason}. The column on the right is what is already on
                the register ({m.memberNumber}).{" "}
                <Link href={`/members/${m.id}`} className="text-bronze-600 hover:underline dark:text-bronze-300">
                  Open their record
                </Link>
                .
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="mb-4">
        <CardHeader
          title="What was submitted"
          subtitle={m ? "Beside it, what is already on the register" : undefined}
        />
        <Line label="Full name" value={a.fullName} other={m?.fullName} differs={!!m && m.fullName !== a.fullName} />
        <Line label="Surname" value={a.surname} other={m?.surname} differs={!!m && m.surname !== a.surname} />
        <Line label="ID number" value={a.idNumber} other={m?.idNumber} differs={!!m && !!a.idNumber && m.idNumber !== a.idNumber} />
        <Line label="Date of birth" value={d(a.dob)} other={m ? d(m.dob) : undefined} differs={!!m && d(m.dob) !== d(a.dob)} />
        <Line label="Gender" value={a.gender ? enumLabel(a.gender) : null} other={m?.gender ? enumLabel(m.gender) : undefined} />
        <Line label="Marital status" value={a.maritalStatus ? enumLabel(a.maritalStatus) : null} other={m?.maritalStatus ? enumLabel(m.maritalStatus) : undefined} />
        <Line label="Telephone" value={a.phone} other={m?.phone} differs={!!m && m.phone !== a.phone} />
        <Line label="Email" value={a.email} other={m?.email} differs={!!m && m.email !== a.email} />
        <Line label="Address" value={[a.addressLine, a.city, a.province, a.postalCode].filter(Boolean).join(", ")} other={m ? [m.addressLine, m.city, m.province, m.postalCode].filter(Boolean).join(", ") : undefined} />
        <Line label="Children" value={a.children} other={m?.children} />
        <Line label="Gave their life" value={d(a.salvationDate)} other={m ? d(m.salvationDate) : undefined} />
        <Line label="Baptised" value={d(a.baptismDate)} other={m ? d(m.baptismDate) : undefined} />
        <Line label="Previous church" value={[a.previousChurch, a.previousChurchLocation].filter(Boolean).join(", ")} other={m ? [m.previousChurch, m.previousChurchLocation].filter(Boolean).join(", ") : undefined} />
        <Line label="Would like to serve" value={a.interestedIn} other={m ? "" : undefined} />
        <Line label="Prayer request" value={a.prayerRequests} other={m?.prayerRequests} />
      </Card>

      {done ? (
        a.reviewNote ? (
          <Card>
            <CardHeader title="Note from the review" />
            <p className="px-5 py-4 text-[13.5px] whitespace-pre-wrap">{a.reviewNote}</p>
          </Card>
        ) : null
      ) : writable ? (
        <Card>
          <CardHeader title="Decide" />
          {/* One form, several actions. The note has to travel with whichever
              decision is taken, so the buttons cannot each sit in a form of
              their own — the note would be left behind. */}
          <form className="space-y-4 p-5">
            <Textarea
              name="reviewNote"
              rows={2}
              placeholder="A note for the record — optional"
            />

            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" formAction={acceptApplication.bind(null, a.id)}>
                <UserPlus size={15} /> Add as a new member
              </Button>

              {m ? (
                <>
                  <Button type="submit" formAction={mergeApplication.bind(null, a.id)}>
                    <Merge size={15} /> Fill in {m.fullName}&rsquo;s gaps
                  </Button>
                  <Button type="submit" variant="ghost" formAction={async () => {
                    "use server";
                    await notADuplicate(a.id);
                  }}>
                    <Check size={15} /> Not the same person
                  </Button>
                </>
              ) : null}

              <Button type="submit" variant="ghost" className="text-danger" formAction={declineApplication.bind(null, a.id)}>
                <X size={15} /> Decline
              </Button>
            </div>

            <p className="text-[12.5px] leading-relaxed text-[var(--text-muted)]">
              Merging only fills in details the register does not already have.
              What someone in the office typed is never overwritten by a form
              filled in from the public link.
            </p>
          </form>
        </Card>
      ) : (
        <p className="text-[13px] text-[var(--text-muted)]">
          Your office can read these forms; the secretary or the administrator accepts them.
        </p>
      )}

      <Link href="/applications" className="mt-4 inline-block text-[13px] text-bronze-600 hover:underline dark:text-bronze-300">
        ← All forms
      </Link>
    </div>
  );
}
