import { db } from "@/lib/db";
import { requireArea } from "@/lib/guards";
import { saveChildrensActivity } from "@/lib/actions/children";
import { PageHeader } from "@/components/ui";
import { ChildrensActivityForm } from "@/components/forms/childrens-activity-form";

export default async function NewChildrensActivityPage() {
  await requireArea("children", true);
  const dept = await db.department.findUnique({ where: { code: "CHILD" } });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Plan a children's activity" />
      <ChildrensActivityForm action={saveChildrensActivity.bind(null, null)} leaderDefault={dept?.leaderName} />
    </div>
  );
}
