import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { financialYearBounds } from "@/lib/finance";
import { today } from "@/lib/demo";
import { formatDate, formatZAR, enumLabel } from "@/lib/format";
import { PrintBar, PrintSheet } from "@/components/print-sheet";

export default async function DonorStatement({
  searchParams,
}: {
  searchParams: Promise<{ member?: string }>;
}) {
  const sp = await searchParams;
  const fy = financialYearBounds(today(), 3);
  const session = await getSession();

  if (!sp.member) {
    return (
      <>
        <PrintBar backHref="/reports" />
        <PrintSheet title="Contribution Statement" period={`Financial year ${fy.label}`}>
          <p className="py-8 text-center text-neutral-500 italic">
            Open a member&rsquo;s profile and choose &ldquo;Statement&rdquo; to
            produce their contribution statement.
          </p>
        </PrintSheet>
      </>
    );
  }

  const [member, lines, settings] = await Promise.all([
    db.member.findFirst({ where: { id: sp.member, deletedAt: null } }),
    db.contributionLine.findMany({
      where: {
        memberId: sp.member,
        batch: { status: "POSTED", serviceDate: { gte: fy.start, lte: fy.end } },
      },
      include: { batch: true, fund: true, account: true },
      orderBy: { batch: { serviceDate: "asc" } },
    }),
    db.settings.findFirst(),
  ]);

  if (!member) {
    return (
      <>
        <PrintBar backHref="/reports" />
        <PrintSheet title="Contribution Statement">
          <p className="py-8 text-center text-neutral-500 italic">Member not found.</p>
        </PrintSheet>
      </>
    );
  }

  const total = lines.reduce((s, l) => s + l.amount, 0);
  const eligible = lines.filter((l) => l.fund.is18aEligible);
  const eligibleTotal = eligible.reduce((s, l) => s + l.amount, 0);

  return (
    <>
      <PrintBar backHref={`/members/${member.id}`} label="Print statement" />
      <PrintSheet
        title="Contribution Statement"
        period={`${formatDate(fy.start)} to ${formatDate(fy.end)}`}
        subtitle={`${member.fullName} · ${member.memberNumber}`}
        generatedBy={session?.name}
      >
        <div className="mb-5 text-[11px] leading-relaxed">
          <p className="font-semibold">{member.fullName}</p>
          {member.addressLine ? <p>{member.addressLine}</p> : null}
          <p>{[member.city, member.province, member.postalCode].filter(Boolean).join(", ")}</p>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-24 border-b border-black py-1.5 text-left font-semibold">Date</th>
              <th className="border-b border-black py-1.5 text-left font-semibold">Fund</th>
              <th className="w-32 border-b border-black py-1.5 text-left font-semibold">Category</th>
              <th className="w-20 border-b border-black py-1.5 text-left font-semibold">Method</th>
              <th className="w-20 border-b border-black py-1.5 text-left font-semibold">Ref</th>
              <th className="w-28 border-b border-black py-1.5 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-neutral-500 italic">
                  No contributions recorded in this period.
                </td>
              </tr>
            ) : (
              lines.map((l) => (
                <tr key={l.id}>
                  <td className="tnum py-1.5">{formatDate(l.batch.serviceDate)}</td>
                  <td className="py-1.5">{l.fund.name}</td>
                  <td className="py-1.5">{l.account.name}</td>
                  <td className="py-1.5">{enumLabel(l.method)}</td>
                  <td className="tnum py-1.5">{l.reference ?? "—"}</td>
                  <td className="tnum py-1.5 text-right">{formatZAR(l.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td colSpan={5} className="border-t-2 border-black py-2">Total contributions</td>
              <td className="tnum border-t-2 border-black py-2 text-right">{formatZAR(total)}</td>
            </tr>
          </tfoot>
        </table>

        {settings?.is18aApproved ? (
          <div className="mt-6 border border-neutral-400 p-3">
            <p className="mb-1 text-[11px] font-semibold">Section 18A</p>
            <p className="text-[10px] leading-relaxed text-neutral-700">
              Of the above, {formatZAR(eligibleTotal)} was given to funds
              approved for section 18A purposes. Ordinary tithes and general
              offerings are not deductible under section 18A. A separate
              section 18A receipt is issued for qualifying donations and this
              statement is not itself a section 18A receipt.
            </p>
          </div>
        ) : (
          <p className="mt-6 text-[10px] leading-relaxed text-neutral-500">
            This statement is provided for your own records. It is not a section
            18A tax certificate.
          </p>
        )}

        <p className="mt-6 text-[10px] leading-relaxed text-neutral-500">
          Thank you for your faithful giving. Please contact the church office
          if anything on this statement appears incorrect.
        </p>
      </PrintSheet>
    </>
  );
}
