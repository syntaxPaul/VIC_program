import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Lock, Printer } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate, formatZAR, enumLabel } from "@/lib/format";
import { closeStocktake, recordVerification } from "@/lib/actions/assets";
import {
  Badge, Button, Card, CardHeader, PageHeader, Select, TableWrap, Td, Th,
} from "@/components/ui";

const OUTCOME_TONE = {
  FOUND: "success", MISSING: "danger", MOVED: "warning",
  UNRECORDED: "info", DAMAGED: "warning",
} as const;

export default async function StocktakeRoundPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [round, assets] = await Promise.all([
    db.stocktake.findUnique({
      where: { id },
      include: {
        verifications: { include: { asset: true, verifiedBy: true } },
      },
    }),
    db.asset.findMany({
      where: { deletedAt: null, status: { notIn: ["DISPOSED", "WRITTEN_OFF"] } },
      orderBy: [{ location: "asc" }, { assetCode: "asc" }],
    }),
  ]);

  if (!round) notFound();

  const byAsset = new Map(round.verifications.map((v) => [v.assetId, v]));
  const closed = round.status === "CLOSED";

  const counts = {
    verified: round.verifications.length,
    found: round.verifications.filter((v) => v.outcome === "FOUND").length,
    exceptions: round.verifications.filter((v) => v.outcome !== "FOUND").length,
    outstanding: assets.length - round.verifications.length,
  };

  const record = recordVerification.bind(null, round.id);

  return (
    <div className="mx-auto max-w-[1400px] 2xl:max-w-[1760px]">
      <PageHeader
        title={round.name}
        description={`Cutoff ${formatDate(round.cutoffDate)}${round.scopeNote ? ` · ${round.scopeNote}` : ""}`}
        actions={
          <>
            <Link href={`/stocktake/${round.id}/count-sheet`}>
              <Button><Printer size={15} /> Count sheets</Button>
            </Link>
            {!closed && counts.outstanding === 0 ? (
              <form action={closeStocktake.bind(null, round.id)}>
                <Button type="submit" variant="primary"><Lock size={15} /> Close round</Button>
              </form>
            ) : null}
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Stat label="Verified" value={counts.verified} total={assets.length} />
        <Stat label="Found as expected" value={counts.found} tone="success" />
        <Stat label="Exceptions" value={counts.exceptions} tone="warning" />
        <Stat label="Outstanding" value={counts.outstanding} tone={counts.outstanding ? "danger" : "success"} />
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="Verification"
          subtitle={closed ? "This round is closed and read-only" : "Confirm each asset by tag or serial number"}
        />
        <TableWrap>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Asset</Th>
              <Th>Expected location</Th>
              <Th numeric>Cost</Th>
              <Th>Outcome</Th>
              {!closed ? <Th>Record</Th> : <Th>Verified</Th>}
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => {
              const v = byAsset.get(a.id);
              return (
                <tr key={a.id} className="hover:bg-sand-50 dark:hover:bg-sand-800/40">
                  <Td label="Code" className="tnum text-[var(--text-muted)]">{a.assetCode}</Td>
                  <Td label="Asset">
                    <Link href={`/assets/${a.id}`} className="font-medium hover:underline">
                      {a.description}
                    </Link>
                    {a.serialNumber ? (
                      <span className="tnum block text-[12px] text-[var(--text-muted)]">
                        {a.serialNumber}
                      </span>
                    ) : null}
                  </Td>
                  <Td label="Expected location" className="text-[13px]">{a.location ?? "—"}</Td>
                  <Td label="Cost" numeric className="text-[var(--text-muted)]">
                    {formatZAR(a.acquisitionCost, { decimals: false })}
                  </Td>
                  <Td label="Outcome">
                    {v ? (
                      <Badge tone={OUTCOME_TONE[v.outcome]}>{enumLabel(v.outcome)}</Badge>
                    ) : (
                      <span className="text-[12.5px] text-[var(--text-muted)]">Not verified</span>
                    )}
                  </Td>
                  <Td label="Record">
                    {closed ? (
                      <span className="text-[12.5px] text-[var(--text-muted)]">
                        {v ? `${formatDate(v.verifiedAt)}${v.verifiedBy ? ` · ${v.verifiedBy.name}` : ""}` : "—"}
                      </span>
                    ) : (
                      <form action={record} className="flex items-center gap-1.5">
                        <input type="hidden" name="assetId" value={a.id} />
                        <Select
                          name="outcome"
                          defaultValue={v?.outcome ?? "FOUND"}
                          className="h-8 w-32 text-[12.5px]"
                        >
                          <option value="FOUND">Found</option>
                          <option value="MISSING">Missing</option>
                          <option value="MOVED">Moved</option>
                          <option value="DAMAGED">Damaged</option>
                        </Select>
                        <Select
                          name="condition"
                          defaultValue={v?.condition ?? a.condition}
                          className="h-8 w-24 text-[12.5px]"
                        >
                          {["NEW", "GOOD", "FAIR", "POOR", "UNSERVICEABLE"].map((c) => (
                            <option key={c} value={c}>{enumLabel(c)}</option>
                          ))}
                        </Select>
                        <Button size="sm" type="submit">
                          <CheckCircle2 size={13} />
                        </Button>
                      </form>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}

function Stat({
  label, value, total, tone = "neutral",
}: {
  label: string;
  value: number;
  total?: number;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const colors = {
    neutral: "", success: "text-success", warning: "text-warning", danger: "text-danger",
  };
  return (
    <Card className="p-4">
      <p className="text-[12.5px] font-medium text-[var(--text-muted)]">{label}</p>
      <p className={`tnum mt-1.5 text-[24px] leading-none font-semibold ${colors[tone]}`}>
        {value}
        {total !== undefined ? (
          <span className="text-[15px] font-normal text-[var(--text-muted)]"> / {total}</span>
        ) : null}
      </p>
    </Card>
  );
}
