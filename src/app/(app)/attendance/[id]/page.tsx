import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { saveAttendanceEntries } from "@/lib/actions/admin";
import { AttendanceRegister } from "@/components/attendance-register";
import { Button, PageHeader } from "@/components/ui";

export default async function AttendanceRegisterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [register, members] = await Promise.all([
    db.attendanceRegister.findUnique({
      where: { id },
      include: { entries: true },
    }),
    db.member.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      orderBy: [{ surname: "asc" }, { fullName: "asc" }],
      include: { ministries: { include: { ministry: true }, take: 1 } },
    }),
  ]);

  if (!register) notFound();

  const present = new Map(register.entries.map((e) => [e.memberId, e.present]));

  return (
    <div className="mx-auto max-w-[1400px] 2xl:max-w-[1760px]">
      <PageHeader
        title={register.serviceName}
        description={`${formatDate(register.serviceDate)}${
          register.entries.length === 0
            ? " · headcount only, no individual register kept yet"
            : ""
        }`}
        actions={
          <Link href="/attendance">
            <Button>Back to attendance</Button>
          </Link>
        }
      />

      <AttendanceRegister
        action={saveAttendanceEntries.bind(null, register.id)}
        members={members.map((m) => ({
          id: m.id,
          fullName: m.fullName,
          memberNumber: m.memberNumber,
          ministry: m.ministries[0]?.ministry.name ?? null,
          present: present.get(m.id) ?? false,
        }))}
      />
    </div>
  );
}
