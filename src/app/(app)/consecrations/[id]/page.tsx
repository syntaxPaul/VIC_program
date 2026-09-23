import Link from "next/link";
import { notFound } from "next/navigation";
import { Award } from "lucide-react";
import { db } from "@/lib/db";
import { can } from "@/lib/roles";
import { requireArea } from "@/lib/guards";
import { issueConsecrationCertificate, saveConsecration } from "@/lib/actions/consecrations";
import { formatDate } from "@/lib/format";
import { Button, PageHeader } from "@/components/ui";
import { ConsecrationForm } from "@/components/forms/consecration-form";

export default async function ConsecrationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireArea("sacraments");
  const { id } = await params;
  const c = await db.consecration.findFirst({ where: { id, deletedAt: null } });
  if (!c) notFound();
  const writable = can(session.role, "sacraments", true);
  const done = c.status === "CONSECRATED" && c.consecrationDate;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={c.childName}
        description={c.registerNumber ? `Register ${c.registerNumber}` : c.consecrationDate ? formatDate(c.consecrationDate) : "Date not yet set"}
        actions={
          done ? (
            c.certificateIssuedAt ? (
              <Link href={`/consecrations/${c.id}/certificate`}><Button variant="primary"><Award size={15} /> Certificate</Button></Link>
            ) : writable ? (
              <form action={async () => { "use server"; await issueConsecrationCertificate(c.id); }}>
                <Button type="submit" variant="primary"><Award size={15} /> Issue certificate</Button>
              </form>
            ) : null
          ) : null
        }
      />
      {writable ? <ConsecrationForm action={saveConsecration.bind(null, c.id)} value={c} /> : null}
    </div>
  );
}
