import { db } from "@/lib/db";
import { today } from "@/lib/demo";
import { requireArea } from "@/lib/guards";
import { saveWelfareGrant } from "@/lib/actions/welfare";
import { PageHeader } from "@/components/ui";
import { WelfareForm } from "@/components/forms/welfare-form";

export default async function NewWelfarePage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  await requireArea("welfare", true);
  const sp = await searchParams;
  const [members, days, dept] = await Promise.all([
    db.member.findMany({ where: { deletedAt: null, status: "ACTIVE" }, orderBy: [{ surname: "asc" }, { fullName: "asc" }], select: { id: true, fullName: true, memberNumber: true } }),
    db.event.findMany({ where: { deletedAt: null, category: "WELFARE", startsAt: { gte: new Date(today().getTime() - 30 * 864e5) } }, orderBy: { startsAt: "asc" }, select: { id: true, title: true, startsAt: true } }),
    db.department.findUnique({ where: { code: "WELF" } }),
  ]);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Record help given" description="Food, clothing, blankets or other support." />
      <WelfareForm action={saveWelfareGrant.bind(null, null)} members={members} days={days} dayId={sp.day} leaderDefault={dept?.leaderName} />
    </div>
  );
}
