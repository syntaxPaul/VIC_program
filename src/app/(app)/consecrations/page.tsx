import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { can } from "@/lib/roles";
import { requireArea } from "@/lib/guards";
import { formatDate } from "@/lib/format";
import { Button, PageHeader } from "@/components/ui";
import { Panel, Row, Stage } from "@/components/home/kit";
import { Card, CardHeader } from "@/components/ui";

export default async function ConsecrationsPage() {
  const session = await requireArea("sacraments");
  const writable = can(session.role, "sacraments", true);
  const all = await db.consecration.findMany({
    where: { deletedAt: null },
    orderBy: [{ consecrationDate: "desc" }, { createdAt: "desc" }],
  });
  const by = (s: string) => all.filter((c) => c.status === s);
  const parents = (c: (typeof all)[number]) =>
    [c.fatherName, c.motherName].filter(Boolean).join(" & ") || c.guardianName || "parents not recorded";

  return (
    <div className="mx-auto max-w-[1000px] 2xl:max-w-[1240px]">
      <PageHeader
        title="Child consecrations"
        description="Children dedicated to the Lord before the congregation, with their certificates."
        actions={writable ? <Link href="/consecrations/new"><Button variant="primary"><Plus size={15} /> Record a request</Button></Link> : null}
      />

      <Card className="mb-4">
        <CardHeader title="Where each family is" />
        <div className="flex flex-wrap gap-3 p-5">
          <Stage label="Requested" count={by("REQUESTED").length} href="#requested" />
          <Stage label="Date set" count={by("SCHEDULED").length} href="#scheduled" accent />
          <Stage label="Consecrated" count={by("CONSECRATED").length} href="#done" />
        </div>
      </Card>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Panel title="Date set" empty="Nothing scheduled.">
          {by("SCHEDULED").map((c) => (
            <Row key={c.id} href={`/consecrations/${c.id}`} title={c.childName} meta={parents(c)} right={c.consecrationDate ? formatDate(c.consecrationDate) : "—"} />
          ))}
        </Panel>
        <Panel title="Requested" subtitle="Waiting for a date" empty="No requests waiting.">
          {by("REQUESTED").map((c) => (
            <Row key={c.id} href={`/consecrations/${c.id}`} title={c.childName} meta={[parents(c), c.parentPhone].filter(Boolean).join(" · ")} right={formatDate(c.createdAt)} />
          ))}
        </Panel>
        <Panel title="Consecrated" className="lg:col-span-2" empty="None recorded yet.">
          {by("CONSECRATED").map((c) => (
            <Row
              key={c.id}
              href={`/consecrations/${c.id}`}
              title={c.childName}
              meta={[parents(c), c.registerNumber].filter(Boolean).join(" · ")}
              right={c.certificateIssuedAt ? formatDate(c.consecrationDate) : <span className="text-bronze-700 dark:text-bronze-300">certificate not issued</span>}
            />
          ))}
        </Panel>
      </div>
    </div>
  );
}
