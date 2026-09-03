import Link from "next/link";
import { Package, Plus, Search } from "lucide-react";
import { db } from "@/lib/db";
import { depreciation } from "@/lib/finance";
import { today } from "@/lib/demo";
import { formatDate, formatZAR, formatZARCompact, enumLabel } from "@/lib/format";
import { KpiGrid, KpiTile } from "@/components/kpi";
import {
  Badge, Button, Card, EmptyState, Input, PageHeader, Select,
  TableWrap, Td, Th,
} from "@/components/ui";
import type { AssetCategory, Prisma } from "@/generated/prisma";

const CATEGORIES: AssetCategory[] = [
  "LAND_AND_BUILDINGS", "FURNITURE_AND_FITTINGS", "MUSICAL_AND_SOUND",
  "IT_EQUIPMENT", "VEHICLES", "KITCHEN_EQUIPMENT", "BOOKS_AND_MEDIA", "OTHER",
];

const CONDITION_TONE = {
  NEW: "success", GOOD: "success", FAIR: "warning",
  POOR: "warning", UNSERVICEABLE: "danger",
} as const;

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; location?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const showDisposed = sp.view === "disposed";

  const where: Prisma.AssetWhereInput = {
    deletedAt: null,
    status: showDisposed
      ? { in: ["DISPOSED", "WRITTEN_OFF"] }
      : { notIn: ["DISPOSED", "WRITTEN_OFF"] },
    ...(q
      ? {
          OR: [
            { description: { contains: q } },
            { assetCode: { contains: q } },
            { serialNumber: { contains: q } },
            { makeModel: { contains: q } },
          ],
        }
      : {}),
    ...(sp.category ? { category: sp.category as AssetCategory } : {}),
    ...(sp.location ? { location: sp.location } : {}),
  };

  const [assets, active, locations] = await Promise.all([
    db.asset.findMany({
      where,
      include: { custodian: true, fund: true },
      orderBy: { assetCode: "asc" },
    }),
    db.asset.findMany({
      where: { deletedAt: null, status: { notIn: ["DISPOSED", "WRITTEN_OFF"] } },
      select: {
        acquisitionCost: true, residualValue: true,
        usefulLifeYears: true, acquisitionDate: true, insuredValue: true,
      },
    }),
    db.asset.findMany({
      where: { deletedAt: null, location: { not: null } },
      select: { location: true },
      distinct: ["location"],
    }),
  ]);

  const asAt = today();
  const cost = active.reduce((s, a) => s + a.acquisitionCost, 0);
  const accumulated = active.reduce((s, a) => s + depreciation(a, asAt).accumulated, 0);
  const insured = active.reduce((s, a) => s + (a.insuredValue ?? 0), 0);
  const filtered = Boolean(q || sp.category || sp.location);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Asset register"
        description="Everything the church owns, what it cost, and what it is worth today."
        actions={
          <>
            <Link href="/reports/asset-register"><Button>Printable register</Button></Link>
            <Link href="/assets/new">
              <Button variant="primary"><Plus size={15} /> Add asset</Button>
            </Link>
          </>
        }
      />

      <div className="mb-4">
        <KpiGrid>
          <KpiTile label="Assets in use" value={String(active.length)} icon={<Package size={15} />} />
          <KpiTile label="Total at cost" value={formatZARCompact(cost)} />
          <KpiTile label="Accumulated depreciation" value={formatZARCompact(accumulated)} />
          <KpiTile label="Net book value" value={formatZARCompact(cost - accumulated)} accent />
          <KpiTile label="Insured value" value={formatZARCompact(insured)} comparison="replacement cover" />
        </KpiGrid>
      </div>

      <div className="mb-4 flex gap-2">
        <Link href="/assets">
          <Button variant={showDisposed ? "ghost" : "secondary"}>In use</Button>
        </Link>
        <Link href="/assets?view=disposed">
          <Button variant={showDisposed ? "secondary" : "ghost"}>Disposed &amp; written off</Button>
        </Link>
      </div>

      <Card className="mb-4">
        <form className="flex flex-wrap items-end gap-3 p-3">
          {showDisposed ? <input type="hidden" name="view" value="disposed" /> : null}
          <div className="relative min-w-52 flex-1">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input name="q" defaultValue={q} placeholder="Search description, code or serial…" className="pl-9" />
          </div>
          <Select name="category" defaultValue={sp.category ?? ""} className="w-52">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{enumLabel(c)}</option>
            ))}
          </Select>
          <Select name="location" defaultValue={sp.location ?? ""} className="w-44">
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l.location} value={l.location!}>{l.location}</option>
            ))}
          </Select>
          <Button type="submit">Apply</Button>
          {filtered ? (
            <Link href={showDisposed ? "/assets?view=disposed" : "/assets"}>
              <Button type="button" variant="ghost">Clear</Button>
            </Link>
          ) : null}
        </form>
      </Card>

      <Card className="overflow-hidden">
        {assets.length === 0 ? (
          <EmptyState
            icon={<Package size={18} />}
            title={filtered ? "No assets match these filters" : showDisposed ? "Nothing disposed or written off" : "No assets recorded yet"}
            description={
              filtered
                ? "Try a different search term or clear the filters."
                : showDisposed
                  ? "Assets that are written off will be kept here with their approval reference."
                  : "Add the church's equipment, instruments and furniture to build the register."
            }
            action={
              filtered ? (
                <Link href="/assets"><Button>Clear filters</Button></Link>
              ) : !showDisposed ? (
                <Link href="/assets/new"><Button variant="primary"><Plus size={15} /> Add asset</Button></Link>
              ) : undefined
            }
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Code</Th>
                <Th>Asset</Th>
                <Th>Category</Th>
                <Th>Location</Th>
                <Th>Condition</Th>
                <Th numeric>Cost</Th>
                {showDisposed ? <Th>Approval</Th> : <Th numeric>Book value</Th>}
                <Th>Verified</Th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => {
                const d = depreciation(a, asAt);
                return (
                  <tr key={a.id} className="hover:bg-sand-50 dark:hover:bg-sand-800/40">
                    <Td className="tnum text-[var(--text-muted)]">{a.assetCode}</Td>
                    <Td>
                      <Link href={`/assets/${a.id}`} className="font-medium hover:underline">
                        {a.description}
                      </Link>
                      {a.serialNumber ? (
                        <span className="tnum block text-[12px] text-[var(--text-muted)]">
                          {a.serialNumber}
                        </span>
                      ) : null}
                    </Td>
                    <Td className="text-[13px]">{enumLabel(a.category)}</Td>
                    <Td className="text-[13px]">{a.location ?? "—"}</Td>
                    <Td>
                      <Badge tone={CONDITION_TONE[a.condition]}>{enumLabel(a.condition)}</Badge>
                    </Td>
                    <Td numeric>{formatZAR(a.acquisitionCost, { decimals: false })}</Td>
                    {showDisposed ? (
                      <Td className="text-[12.5px]">
                        <span className="block">{a.approvalReference ?? "—"}</span>
                        <span className="block text-[var(--text-muted)]">
                          {enumLabel(a.disposalMethod)} · {formatDate(a.disposalDate)}
                        </span>
                      </Td>
                    ) : (
                      <Td numeric className="font-medium">
                        {formatZAR(d.netBookValue, { decimals: false })}
                      </Td>
                    )}
                    <Td className="tnum text-[12.5px] text-[var(--text-muted)]">
                      {a.lastVerifiedAt ? formatDate(a.lastVerifiedAt) : "Never"}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
