import { db } from "@/lib/db";
import { saveBaptism } from "@/lib/actions/planner";
import { today } from "@/lib/demo";
import { BaptismForm } from "@/components/baptism-form";
import { PageHeader } from "@/components/ui";

export default async function NewBaptismPage() {
  const members = await db.member.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, memberNumber: true },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Add baptism candidate"
        description="Track the candidate through class, approval and baptism."
      />
      <BaptismForm
        action={saveBaptism.bind(null, null)}
        members={members}
        defaultYear={today().getFullYear()}
        cancelHref="/baptisms"
      />
    </div>
  );
}
