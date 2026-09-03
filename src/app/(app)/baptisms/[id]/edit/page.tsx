import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { saveBaptism } from "@/lib/actions/planner";
import { today } from "@/lib/demo";
import { BaptismForm } from "@/components/baptism-form";
import { PageHeader } from "@/components/ui";

export default async function EditBaptismPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [record, members] = await Promise.all([
    db.baptism.findFirst({ where: { id, deletedAt: null } }),
    db.member.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, memberNumber: true },
    }),
  ]);

  if (!record) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={record.fullName} description={`${record.programmeYear} programme`} />
      <BaptismForm
        action={saveBaptism.bind(null, id)}
        values={record}
        members={members}
        defaultYear={today().getFullYear()}
        cancelHref={`/baptisms/${id}`}
      />
    </div>
  );
}
