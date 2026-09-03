import { db } from "@/lib/db";
import { saveMember } from "@/lib/actions/members";
import { MemberForm } from "@/components/member-form";
import { PageHeader } from "@/components/ui";

export default async function NewMemberPage() {
  const [ministries, interests, settings] = await Promise.all([
    db.ministry.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.interest.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.settings.findFirst(),
  ]);

  const action = saveMember.bind(null, null);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Register member"
        description="A member number is assigned automatically once you save."
      />
      <MemberForm
        action={action}
        ministries={ministries}
        interests={interests}
        show18a={settings?.is18aApproved ?? false}
      />
    </div>
  );
}
