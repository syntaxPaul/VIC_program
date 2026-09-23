import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { can } from "@/lib/roles";
import { requireArea } from "@/lib/guards";
import { deleteChildrensActivity, saveChildrensActivity } from "@/lib/actions/children";
import { enumLabel, formatDate, formatTime } from "@/lib/format";
import { Button, Card, CardHeader, PageHeader } from "@/components/ui";
import { ChildrensActivityForm } from "@/components/forms/childrens-activity-form";

export default async function ChildrensActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireArea("children");
  const { id } = await params;
  const a = await db.childrensActivity.findFirst({ where: { id, deletedAt: null } });
  if (!a) notFound();

  if (!can(session.role, "children", true)) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title={a.title} description={`${formatDate(a.startsAt)} ${formatTime(a.startsAt)} · ${enumLabel(a.ageGroup)}`} />
        <Card>
          <CardHeader title="The lesson" />
          <dl className="grid grid-cols-1 gap-3 p-5 text-[13.5px] sm:grid-cols-2">
            {[["Lesson", a.lessonTitle], ["Scripture", a.scripture], ["Memory verse", a.memoryVerse], ["Leading", a.leader], ["Helpers", a.helpers], ["Came", a.attended]].map(([k, v]) =>
              v != null && v !== "" ? (<div key={String(k)}><dt className="text-[var(--text-muted)]">{k}</dt><dd>{String(v)}</dd></div>) : null,
            )}
          </dl>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={a.title} description="Changes here move it on the church calendar too." />
      <ChildrensActivityForm action={saveChildrensActivity.bind(null, a.id)} value={a} />
      <form action={deleteChildrensActivity.bind(null, a.id)} className="mt-4">
        <Button type="submit" variant="ghost" className="text-danger"><Trash2 size={14} /> Remove it</Button>
      </form>
    </div>
  );
}
