import Link from "next/link";
import { HeartHandshake, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { createMinistry } from "@/lib/actions/admin";
import { initials } from "@/lib/format";
import {
  Button, Card, CardHeader, EmptyState, Field, Input, PageHeader, Textarea,
} from "@/components/ui";

export default async function MinistriesPage() {
  const [ministries, interests] = await Promise.all([
    db.ministry.findMany({
      orderBy: { name: "asc" },
      include: {
        members: {
          include: { member: { select: { id: true, fullName: true } } },
          take: 6,
        },
        _count: { select: { members: true } },
      },
    }),
    db.interest.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { members: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-[1200px] 2xl:max-w-[1500px]">
      <PageHeader
        title="Ministries"
        description="Groups and teams members serve in."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {ministries.length === 0 ? (
            <Card>
              <EmptyState
                icon={<HeartHandshake size={18} />}
                title="No ministries yet"
                description="Add the first ministry to start assigning members."
              />
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {ministries.map((m) => (
                <Card key={m.id} className="p-5">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h2 className="text-[14.5px] font-semibold">{m.name}</h2>
                    <span className="tnum shrink-0 rounded-full bg-sand-100 px-2 py-0.5 text-[12px] font-medium dark:bg-sand-800">
                      {m._count.members}
                    </span>
                  </div>
                  {m.description ? (
                    <p className="mb-3 text-[12.5px] text-[var(--text-muted)]">{m.description}</p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {m.members.slice(0, 6).map((mm) => (
                      <Link
                        key={mm.memberId}
                        href={`/members/${mm.member.id}`}
                        title={mm.member.fullName}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-sand-100 text-[10.5px] font-semibold text-sand-600 transition-colors hover:bg-bronze-100 dark:bg-sand-800 dark:text-sand-300"
                      >
                        {initials(mm.member.fullName)}
                      </Link>
                    ))}
                    {m._count.members > 6 ? (
                      <span className="text-[12px] text-[var(--text-muted)]">
                        +{m._count.members - 6}
                      </span>
                    ) : null}
                    {m._count.members === 0 ? (
                      <span className="text-[12.5px] text-[var(--text-muted)]">
                        No members assigned
                      </span>
                    ) : null}
                  </div>
                  <Link
                    href={`/members?ministry=${m.id}`}
                    className="mt-3 inline-block text-[12.5px] font-medium text-bronze-600 hover:underline dark:text-bronze-300"
                  >
                    View members →
                  </Link>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardHeader title="Areas of interest" subtitle="What members have offered to help with" />
            <div className="flex flex-wrap gap-2 p-5">
              {interests.map((i) => (
                <span
                  key={i.id}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px]"
                >
                  {i.name}
                  <span className="tnum text-[11.5px] text-[var(--text-muted)]">
                    {i._count.members}
                  </span>
                </span>
              ))}
            </div>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title="Add ministry" />
          <form action={createMinistry}>
            <div className="space-y-4 p-5">
              <Field label="Name">
                <Input name="name" required placeholder="e.g. Prayer Team" />
              </Field>
              <Field label="Description" optional>
                <Textarea name="description" rows={3} />
              </Field>
            </div>
            <div className="border-t px-5 py-3">
              <Button type="submit" variant="primary" className="w-full">
                <Plus size={15} /> Add ministry
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
