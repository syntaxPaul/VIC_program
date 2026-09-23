import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { can } from "@/lib/roles";
import { requireArea } from "@/lib/guards";
import { deleteYouthMeeting, saveYouthMeeting } from "@/lib/actions/youth";
import { enumLabel, formatDate, formatTime } from "@/lib/format";
import { Button, Card, CardHeader, PageHeader } from "@/components/ui";
import { YouthMeetingForm } from "@/components/forms/youth-meeting-form";

export default async function YouthMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireArea("youth");
  const { id } = await params;
  const m = await db.youthMeeting.findFirst({ where: { id, deletedAt: null } });
  if (!m) notFound();

  if (!can(session.role, "youth", true)) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title={m.title} description={`${enumLabel(m.division)} · ${formatDate(m.startsAt)} ${formatTime(m.startsAt)}`} />
        <Card>
          <CardHeader title={m.scripture ?? "Meeting"} subtitle={m.theme ?? undefined} />
          <div className="space-y-3 p-5 text-[13.5px]">
            {m.outline ? <p className="whitespace-pre-wrap">{m.outline}</p> : null}
            {m.questions ? <p className="whitespace-pre-wrap text-[var(--text-muted)]">{m.questions}</p> : null}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={m.title} description="Changes here move it on the church calendar too." />
      <YouthMeetingForm action={saveYouthMeeting.bind(null, m.id)} value={m} />
      <form action={deleteYouthMeeting.bind(null, m.id)} className="mt-4">
        <Button type="submit" variant="ghost" className="text-danger"><Trash2 size={14} /> Remove it</Button>
      </form>
    </div>
  );
}
