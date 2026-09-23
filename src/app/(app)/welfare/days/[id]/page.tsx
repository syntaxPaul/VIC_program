import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCheck, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { can } from "@/lib/roles";
import { requireArea } from "@/lib/guards";
import { formatDate, formatTime, formatZAR } from "@/lib/format";
import { welfareKindLabel } from "@/lib/welfare-labels";
import { markDayGiven } from "@/lib/actions/welfare";
import { Badge, Button, Card, CardHeader, PageHeader } from "@/components/ui";
import { Panel, Row } from "@/components/home/kit";

export default async function DistributionDayPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireArea("welfare");
  const writable = can(session.role, "welfare", true);
  const seesNames = writable || session.role === "PASTOR";
  const { id } = await params;

  const day = await db.event.findFirst({
    where: { id, deletedAt: null, category: "WELFARE" },
    include: {
      welfare: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: { member: { select: { fullName: true, phone: true } } },
      },
    },
  });
  if (!day) notFound();

  const planned = day.welfare.filter((g) => g.status === "PLANNED").length;
  const value = day.welfare.filter((g) => g.status !== "CANCELLED").reduce((s, g) => s + (g.estimatedValue ?? 0), 0);

  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeader
        title={day.title}
        description={[`${formatDate(day.startsAt)} ${formatTime(day.startsAt)}`, day.location, day.leader && `led by ${day.leader}`].filter(Boolean).join(" · ")}
        actions={
          writable ? (
            <Link href={`/welfare/new?day=${day.id}`}>
              <Button variant="primary"><Plus size={15} /> Add a person</Button>
            </Link>
          ) : null
        }
      />

      {day.description ? (
        <Card className="mb-4">
          <p className="px-5 py-4 text-[13.5px] whitespace-pre-wrap">{day.description}</p>
        </Card>
      ) : null}

      <Card className="mb-4">
        <CardHeader
          title={`${day.welfare.length} ${day.welfare.length === 1 ? "person" : "people"} on the list`}
          subtitle={`${planned} still to receive · ${formatZAR(value)} estimated`}
          action={
            writable && planned > 0 ? (
              <form action={async () => { "use server"; await markDayGiven(day.id); }}>
                <Button type="submit"><CheckCheck size={14} /> Mark all given</Button>
              </form>
            ) : undefined
          }
        />
      </Card>

      <Panel title="The list" empty="Nobody listed yet.">
        {day.welfare.map((g) => (
          <Row
            key={g.id}
            href={writable ? `/welfare/${g.id}` : undefined}
            title={g.confidential && !seesNames ? "Confidential" : g.member?.fullName ?? g.recipientName ?? "—"}
            meta={[welfareKindLabel(g.kind), g.items, g.household].filter(Boolean).join(" · ")}
            right={
              g.status === "GIVEN" ? <Badge tone="success">Given</Badge>
              : g.status === "CANCELLED" ? <Badge>Cancelled</Badge>
              : <Badge tone="warning">To give</Badge>
            }
          />
        ))}
      </Panel>
    </div>
  );
}
