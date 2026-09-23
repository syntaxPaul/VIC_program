import Link from "next/link";
import { AlertTriangle, Eraser, Inbox } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { requireApplicationRead } from "@/lib/guards";
import { can } from "@/lib/roles";
import { clearHandledApplications } from "@/lib/actions/applications";

export default async function ApplicationsPage() {
  const session = await requireApplicationRead();
  const writable = can(session.role, "applications", true);

  const [pending, held, handled] = await Promise.all([
    db.membershipApplication.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
    }),
    db.membershipApplication.findMany({
      where: { status: "HELD_DUPLICATE" },
      orderBy: { createdAt: "asc" },
      include: { possibleDuplicateOf: { select: { id: true, fullName: true, memberNumber: true } } },
    }),
    db.membershipApplication.findMany({
      where: { status: { in: ["ACCEPTED", "MERGED", "DECLINED"] }, clearedAt: null },
      orderBy: { reviewedAt: "desc" },
      take: 20,
    }),
  ]);

  const row = (a: { id: string; fullName: string; surname: string; phone: string | null; city: string | null; createdAt: Date }) => (
    <Link
      key={a.id}
      href={`/applications/${a.id}`}
      className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3 last:border-0 hover:bg-sand-100/60 dark:hover:bg-sand-800/40"
    >
      <div>
        <p className="text-[14px] font-medium">{a.fullName}</p>
        <p className="text-[12.5px] text-[var(--text-muted)]">
          {[a.phone, a.city].filter(Boolean).join(" · ") || "No contact details given"}
        </p>
      </div>
      <span className="text-[12.5px] text-[var(--text-muted)]">{formatDate(a.createdAt)}</span>
    </Link>
  );

  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeader
        title="Membership forms"
        description="Sent in from the public link. Nobody joins the register until you accept them here."
      />

      {held.length > 0 ? (
        <Card className="mb-4 border-warning/40">
          <CardHeader
            title="Held — may already be on the register"
            subtitle="Someone with these details is already a member. Look before you accept."
          />
          {held.map((a) => (
            <Link
              key={a.id}
              href={`/applications/${a.id}`}
              className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3 last:border-0 hover:bg-sand-100/60 dark:hover:bg-sand-800/40"
            >
              <div>
                <p className="flex items-center gap-2 text-[14px] font-medium">
                  <AlertTriangle size={14} className="text-warning" />
                  {a.fullName}
                </p>
                <p className="text-[12.5px] text-[var(--text-muted)]">
                  {a.duplicateReason} as{" "}
                  <span className="font-medium">{a.possibleDuplicateOf?.fullName}</span>
                  {a.possibleDuplicateOf ? ` (${a.possibleDuplicateOf.memberNumber})` : ""}
                </p>
              </div>
              <span className="text-[12.5px] text-[var(--text-muted)]">{formatDate(a.createdAt)}</span>
            </Link>
          ))}
        </Card>
      ) : null}

      <Card className="mb-4">
        <CardHeader title={`Waiting${pending.length ? ` · ${pending.length}` : ""}`} />
        {pending.length ? (
          pending.map(row)
        ) : (
          <EmptyState
            icon={<Inbox size={20} />}
            title="Nothing waiting"
            description="Forms sent from the public link appear here."
          />
        )}
      </Card>

      {handled.length > 0 ? (
        <Card>
          <CardHeader
            title="Recently handled"
            action={
              writable ? (
                <form action={clearHandledApplications}>
                  <Button type="submit" variant="ghost">
                    <Eraser size={14} /> Clear the list
                  </Button>
                </form>
              ) : undefined
            }
          />
          <div className="divide-y">
            {handled.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5">
                <p className="text-[13.5px]">{a.fullName}</p>
                <div className="flex items-center gap-3">
                  <Badge tone={a.status === "DECLINED" ? "neutral" : "success"}>
                    {a.status === "ACCEPTED" ? "Added" : a.status === "MERGED" ? "Merged" : "Declined"}
                  </Badge>
                  <span className="text-[12px] text-[var(--text-muted)]">
                    {a.reviewedBy}{a.reviewedAt ? ` · ${formatDate(a.reviewedAt)}` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
