import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireArea } from "@/lib/guards";
import { enumLabel, formatDate } from "@/lib/format";
import { PrintBar, PrintSheet } from "@/components/print-sheet";
import type { MemberStatus, Prisma } from "@/generated/prisma";

/**
 * The membership register on paper — for a council meeting, a roll call, or
 * the file. It prints whatever the members list was filtered to, so "active
 * members of the choir" prints as exactly that.
 */
export default async function MembersPrint({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; ministry?: string }>;
}) {
  await requireArea("members");
  const session = await getSession();
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = sp.status ?? "";
  const ministryId = sp.ministry ?? "";

  const where: Prisma.MemberWhereInput = {
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { surname: { contains: q, mode: "insensitive" } },
            { memberNumber: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : {}),
    ...(status ? { status: status as MemberStatus } : {}),
    ...(ministryId ? { ministries: { some: { ministryId } } } : {}),
  };

  const [members, ministry] = await Promise.all([
    db.member.findMany({
      where,
      orderBy: [{ surname: "asc" }, { fullName: "asc" }],
      include: { ministries: { include: { ministry: { select: { name: true } } } } },
    }),
    ministryId ? db.ministry.findUnique({ where: { id: ministryId } }) : null,
  ]);

  const scope = [
    status ? enumLabel(status) : "All",
    "members",
    ministry ? `of ${ministry.name}` : null,
    q ? `matching “${q}”` : null,
  ].filter(Boolean).join(" ");

  return (
    <>
      <PrintBar backHref="/members" label="Print the register" />
      <PrintSheet
        title="Membership register"
        period={`${scope} · ${members.length}`}
        subtitle={`As at ${formatDate(new Date())}`}
        generatedBy={session?.name}
        landscape
      >
        <table className="w-full border-collapse text-[10.5px]">
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th className="py-1.5 pr-2">No.</th>
              <th className="py-1.5 pr-2">Name</th>
              <th className="py-1.5 pr-2">Born</th>
              <th className="py-1.5 pr-2">Telephone</th>
              <th className="py-1.5 pr-2">Address</th>
              <th className="py-1.5 pr-2">Ministry</th>
              <th className="py-1.5 pr-2">Status</th>
              <th className="py-1.5">Joined</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-neutral-300 align-top">
                <td className="tnum py-1.5 pr-2 whitespace-nowrap">{m.memberNumber}</td>
                <td className="py-1.5 pr-2 font-medium">{m.fullName}</td>
                <td className="tnum py-1.5 pr-2 whitespace-nowrap">{m.dob ? formatDate(m.dob) : "—"}</td>
                <td className="tnum py-1.5 pr-2 whitespace-nowrap">{m.phone ?? "—"}</td>
                <td className="py-1.5 pr-2">{[m.addressLine, m.city].filter(Boolean).join(", ") || "—"}</td>
                <td className="py-1.5 pr-2">{m.ministries.map((x) => x.ministry.name).join(", ") || "—"}</td>
                <td className="py-1.5 pr-2">{enumLabel(m.status)}</td>
                <td className="tnum py-1.5 whitespace-nowrap">{formatDate(m.registrationDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintSheet>
    </>
  );
}
