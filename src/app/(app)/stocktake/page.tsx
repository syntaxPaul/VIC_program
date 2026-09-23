import Link from "next/link";
import { ScanLine, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate, formatDateInput } from "@/lib/format";
import { today } from "@/lib/demo";
import { createStocktake } from "@/lib/actions/assets";
import {
  Badge, Button, Card, CardHeader, EmptyState, Field, Input,
  PageHeader, Textarea,
} from "@/components/ui";

const TONE = { OPEN: "info", IN_PROGRESS: "warning", REVIEW: "warning", CLOSED: "success" } as const;

export default async function StocktakePage() {
  const [rounds, assetCount] = await Promise.all([
    db.stocktake.findMany({
      orderBy: { openedAt: "desc" },
      include: { _count: { select: { verifications: true } } },
    }),
    db.asset.count({ where: { deletedAt: null, status: { notIn: ["DISPOSED", "WRITTEN_OFF"] } } }),
  ]);

  return (
    <div className="mx-auto max-w-[1200px] 2xl:max-w-[1500px]">
      <PageHeader
        title="Stocktake"
        description="Physically verify the register. Open a round, count by location, then resolve the exceptions."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader title="Stocktake rounds" />
            {rounds.length === 0 ? (
              <EmptyState
                icon={<ScanLine size={18} />}
                title="No stocktake rounds yet"
                description="Open a round to start verifying the asset register."
              />
            ) : (
              <ul className="divide-y">
                {rounds.map((r) => {
                  const pct = assetCount
                    ? Math.round((r._count.verifications / assetCount) * 100)
                    : 0;
                  return (
                    <li key={r.id}>
                      <Link
                        href={`/stocktake/${r.id}`}
                        className="block px-5 py-4 hover:bg-sand-50 dark:hover:bg-sand-800/40"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-[14px] font-medium">{r.name}</span>
                          <Badge tone={TONE[r.status]}>
                            {r.status.replace("_", " ").charAt(0) +
                              r.status.replace("_", " ").slice(1).toLowerCase()}
                          </Badge>
                        </div>
                        <p className="mb-2 text-[12.5px] text-[var(--text-muted)]">
                          Cutoff {formatDate(r.cutoffDate)}
                          {r.scopeNote ? ` · ${r.scopeNote}` : ""}
                          {r.closedAt ? ` · Closed ${formatDate(r.closedAt)}` : ""}
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand-200 dark:bg-sand-800">
                            <div
                              className="h-full rounded-full bg-bronze-500"
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                          <span className="tnum shrink-0 text-[12px] text-[var(--text-muted)]">
                            {r._count.verifications} of {assetCount} verified
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title="Open a round" subtitle="Snapshots the register at the cutoff date" />
          <form action={createStocktake}>
            <div className="space-y-4 p-5">
              <Field label="Name">
                <Input
                  name="name"
                  required
                  defaultValue={`${today().getFullYear()} Annual Stocktake`}
                />
              </Field>
              <Field label="Cutoff date">
                <Input
                  name="cutoffDate"
                  type="date"
                  required
                  defaultValue={formatDateInput(today())}
                />
              </Field>
              <Field label="Scope" optional>
                <Textarea name="scopeNote" rows={2} placeholder="e.g. All locations" />
              </Field>
            </div>
            <div className="border-t px-5 py-3">
              <Button type="submit" variant="primary" className="w-full">
                <Plus size={15} /> Open round
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
