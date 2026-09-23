import Link from "next/link";
import { ClipboardCheck, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { today } from "@/lib/demo";
import { formatDate, formatDateInput, formatNumber } from "@/lib/format";
import { recordAttendance } from "@/lib/actions/admin";
import { AttendanceSpark } from "@/components/charts";
import { KpiGrid, KpiTile } from "@/components/kpi";
import {
  Badge, Button, Card, CardHeader, EmptyState, Field, Input, PageHeader,
  TableWrap, Td, Th, Textarea,
} from "@/components/ui";

export default async function AttendancePage() {
  const registers = await db.attendanceRegister.findMany({
    orderBy: { serviceDate: "desc" },
    take: 30,
    include: { _count: { select: { entries: true } } },
  });

  const withCount = registers.filter((r) => r.headcount !== null);
  const avg = withCount.length
    ? Math.round(withCount.reduce((s, r) => s + (r.headcount ?? 0), 0) / withCount.length)
    : 0;
  const best = withCount.reduce((m, r) => Math.max(m, r.headcount ?? 0), 0);
  const last = withCount[0]?.headcount ?? 0;
  const prev = withCount[1]?.headcount ?? 0;

  const chart = [...withCount]
    .slice(0, 12)
    .reverse()
    .map((r) => ({
      label: new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short" }).format(r.serviceDate),
      value: r.headcount ?? 0,
    }));

  return (
    <div className="mx-auto max-w-[1200px] 2xl:max-w-[1500px]">
      <PageHeader
        title="Attendance"
        description="Service headcounts over time."
      />

      <div className="mb-4">
        <KpiGrid>
          <KpiTile
            label="Last service"
            value={String(last)}
            delta={prev ? ((last - prev) / prev) * 100 : null}
            comparison="vs previous"
          />
          <KpiTile label="Average" value={String(avg)} comparison={`across ${withCount.length} services`} />
          <KpiTile label="Best attendance" value={String(best)} />
          <KpiTile label="Registers kept" value={String(registers.length)} />
        </KpiGrid>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {chart.length > 1 ? (
            <Card>
              <CardHeader title="Attendance trend" subtitle="Last 12 services with a headcount" />
              <div className="p-4">
                <AttendanceSpark data={chart} />
              </div>
            </Card>
          ) : null}

          <Card className="overflow-hidden">
            <CardHeader title="Service registers" />
            {registers.length === 0 ? (
              <EmptyState
                icon={<ClipboardCheck size={18} />}
                title="No registers yet"
                description="Record a headcount after the next service."
              />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Service</Th>
                    <Th numeric>Headcount</Th>
                    <Th>Register</Th>
                    <Th>Notes</Th>
                  </tr>
                </thead>
                <tbody>
                  {registers.map((r) => (
                    <tr key={r.id} className="hover:bg-sand-50 dark:hover:bg-sand-800/40">
                      <Td label="Date" className="tnum">
                        <Link href={`/attendance/${r.id}`} className="font-medium hover:underline">
                          {formatDate(r.serviceDate)}
                        </Link>
                      </Td>
                      <Td label="Service">{r.serviceName}</Td>
                      <Td label="Headcount" numeric className="font-medium">
                        {r.headcount !== null ? formatNumber(r.headcount) : "—"}
                      </Td>
                      <Td label="Register">
                        {r._count.entries > 0 ? (
                          <Badge tone="success">{r._count.entries} named</Badge>
                        ) : (
                          <Link
                            href={`/attendance/${r.id}`}
                            className="text-[12.5px] font-medium text-bronze-600 hover:underline dark:text-bronze-300"
                          >
                            Take register →
                          </Link>
                        )}
                      </Td>
                      <Td label="Notes" className="text-[12.5px] text-[var(--text-muted)]">{r.notes ?? "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title="Record attendance" />
          <form action={recordAttendance}>
            <div className="space-y-4 p-5">
              <Field label="Service date">
                <Input
                  name="serviceDate"
                  type="date"
                  required
                  defaultValue={formatDateInput(today())}
                />
              </Field>
              <Field label="Service">
                <Input name="serviceName" defaultValue="Sunday Service" />
              </Field>
              <Field label="Headcount">
                <Input name="headcount" type="number" min={0} required className="tnum" />
              </Field>
              <Field label="Notes" optional>
                <Textarea name="notes" rows={2} />
              </Field>
            </div>
            <div className="border-t px-5 py-3">
              <Button type="submit" variant="primary" className="w-full">
                <Plus size={15} /> Record
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
