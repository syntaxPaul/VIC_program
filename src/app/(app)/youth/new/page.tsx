import { requireArea } from "@/lib/guards";
import { saveYouthMeeting } from "@/lib/actions/youth";
import { PageHeader } from "@/components/ui";
import { YouthMeetingForm } from "@/components/forms/youth-meeting-form";

export default async function NewYouthMeetingPage({ searchParams }: { searchParams: Promise<{ division?: string }> }) {
  await requireArea("youth", true);
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Plan a youth meeting" />
      <YouthMeetingForm action={saveYouthMeeting.bind(null, null)} division={sp.division} />
    </div>
  );
}
