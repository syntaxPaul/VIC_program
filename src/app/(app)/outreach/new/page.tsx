import { db } from "@/lib/db";
import { requireArea } from "@/lib/guards";
import { saveOutreach } from "@/lib/actions/outreach";
import { PageHeader } from "@/components/ui";
import { OutreachForm } from "@/components/forms/outreach-form";

export default async function NewOutreachPage() {
  await requireArea("outreach", true);
  const dept = await db.department.findUnique({ where: { code: "EVAN" } });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Plan an outreach" />
      <OutreachForm action={saveOutreach.bind(null, null)} leaderDefault={dept?.leaderName} />
    </div>
  );
}
