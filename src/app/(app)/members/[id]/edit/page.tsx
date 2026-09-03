import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { saveMember } from "@/lib/actions/members";
import { MemberForm } from "@/components/member-form";
import { PageHeader } from "@/components/ui";

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [member, ministries, interests, settings] = await Promise.all([
    db.member.findFirst({
      where: { id, deletedAt: null },
      include: { ministries: true, interests: true },
    }),
    db.ministry.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.interest.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.settings.findFirst(),
  ]);

  if (!member) notFound();

  const action = saveMember.bind(null, id);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title={member.fullName} description={`Editing ${member.memberNumber}`} />
      <MemberForm
        action={action}
        values={{
          ...member,
          ministryIds: member.ministries.map((m) => m.ministryId),
          interestIds: member.interests.map((i) => i.interestId),
        }}
        ministries={ministries}
        interests={interests}
        show18a={settings?.is18aApproved ?? false}
      />
    </div>
  );
}
