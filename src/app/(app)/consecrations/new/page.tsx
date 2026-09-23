import { requireArea } from "@/lib/guards";
import { saveConsecration } from "@/lib/actions/consecrations";
import { PageHeader } from "@/components/ui";
import { ConsecrationForm } from "@/components/forms/consecration-form";

export default async function NewConsecrationPage() {
  await requireArea("sacraments", true);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Record a consecration" description="Usually a request from the parents first; the date is set later." />
      <ConsecrationForm action={saveConsecration.bind(null, null)} />
    </div>
  );
}
