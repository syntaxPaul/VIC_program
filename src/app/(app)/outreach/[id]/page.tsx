import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { can } from "@/lib/roles";
import { requireArea } from "@/lib/guards";
import { deleteOutreach, saveOutreach } from "@/lib/actions/outreach";
import { formatDate, formatTime } from "@/lib/format";
import { outreachKindLabel } from "@/lib/outreach-labels";
import { Button, Card, CardHeader, PageHeader } from "@/components/ui";
import { OutreachForm } from "@/components/forms/outreach-form";

export default async function OutreachDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireArea("outreach");
  const { id } = await params;
  const o = await db.outreach.findFirst({ where: { id, deletedAt: null } });
  if (!o) notFound();

  if (!can(session.role, "outreach", true)) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title={o.title} description={`${outreachKindLabel(o.kind)} · ${formatDate(o.startsAt)} ${formatTime(o.startsAt)}`} />
        <Card>
          <CardHeader title="What came of it" subtitle={`${o.peopleReached ?? 0} reached · ${o.decisions ?? 0} decisions · ${o.followUpsDue ?? 0} to follow up`} />
          {o.report ? <p className="px-5 py-4 text-[13.5px] whitespace-pre-wrap">{o.report}</p> : null}
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={o.title} description="Changes here move it on the church calendar too." />
      <OutreachForm action={saveOutreach.bind(null, o.id)} value={o} />
      <form action={deleteOutreach.bind(null, o.id)} className="mt-4">
        <Button type="submit" variant="ghost" className="text-danger"><Trash2 size={14} /> Remove it</Button>
      </form>
    </div>
  );
}
