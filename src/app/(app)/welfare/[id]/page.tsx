import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireArea } from "@/lib/guards";
import { deleteWelfareGrant, saveWelfareGrant } from "@/lib/actions/welfare";
import { welfareKindLabel } from "@/lib/welfare-labels";
import { Button, PageHeader } from "@/components/ui";
import { WelfareForm } from "@/components/forms/welfare-form";

export default async function WelfareGrantPage({ params }: { params: Promise<{ id: string }> }) {
  await requireArea("welfare", true);
  const { id } = await params;
  const [g, members, days] = await Promise.all([
    db.welfareGrant.findFirst({ where: { id, deletedAt: null } }),
    db.member.findMany({ where: { deletedAt: null }, orderBy: [{ surname: "asc" }, { fullName: "asc" }], select: { id: true, fullName: true, memberNumber: true } }),
    db.event.findMany({ where: { deletedAt: null, category: "WELFARE" }, orderBy: { startsAt: "desc" }, take: 20, select: { id: true, title: true, startsAt: true } }),
  ]);
  if (!g) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={welfareKindLabel(g.kind)} />
      <WelfareForm action={saveWelfareGrant.bind(null, g.id)} value={g} members={members} days={days} />
      <form action={deleteWelfareGrant.bind(null, g.id)} className="mt-4">
        <Button type="submit" variant="ghost" className="text-danger"><Trash2 size={14} /> Remove</Button>
      </form>
    </div>
  );
}
