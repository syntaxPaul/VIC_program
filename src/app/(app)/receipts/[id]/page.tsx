import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { cancelReceipt } from "@/lib/actions/receipts";
import { formatDate, formatZAR, enumLabel } from "@/lib/format";
import { PrintBar, PrintSheet } from "@/components/print-sheet";
import { Button, Card, CardHeader, Field, Input } from "@/components/ui";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [r, s] = await Promise.all([
    db.receipt18A.findUnique({ where: { id }, include: { fund: true } }),
    db.settings.findFirst(),
  ]);

  if (!r) notFound();

  return (
    <>
      <PrintBar backHref="/receipts" label="Print receipt" />

      <PrintSheet
        title="Receipt — Section 18A"
        period={`Receipt no. ${r.receiptNumber}`}
        subtitle={r.cancelled ? "CANCELLED" : undefined}
      >
        {r.cancelled ? (
          <p className="mb-4 border-2 border-red-700 px-3 py-2 text-center text-[13px] font-bold tracking-widest text-red-700 uppercase">
            Cancelled — {r.cancelledReason}
          </p>
        ) : null}

        <table className="w-full border-collapse">
          <tbody>
            <Row label="Receipt number" value={r.receiptNumber} />
            <Row label="Date of receipt" value={formatDate(r.donationDate)} />
            <Row label="Date issued" value={formatDate(r.issuedAt)} />
            <Row
              label="Section 18A reference"
              value={s?.section18aNumber || "—"}
            />

            <tr>
              <td colSpan={2} className="pt-5 pb-1 font-semibold tracking-wide uppercase">
                Donor
              </td>
            </tr>
            <Row label="Name" value={r.donorName} />
            {r.donorTradingName ? <Row label="Trading name" value={r.donorTradingName} /> : null}
            <Row label="Nature of donor" value={enumLabel(r.donorNature)} />
            <Row label="Identification" value={`${r.donorIdType ?? "—"} ${r.donorIdNumber ?? ""}`} />
            <Row label="Country of issue" value={r.donorIdCountry} />
            <Row label="Income tax reference" value={r.donorTaxRef ?? "—"} />
            <Row label="Address" value={r.donorAddress ?? "—"} />
            <Row label="Telephone" value={r.donorPhone ?? "—"} />
            <Row label="Email" value={r.donorEmail ?? "—"} />

            <tr>
              <td colSpan={2} className="pt-5 pb-1 font-semibold tracking-wide uppercase">
                Donation
              </td>
            </tr>
            <Row label="Nature of donation" value={r.isInKind ? "Property in kind" : "Cash"} />
            {r.isInKind ? (
              <>
                <Row label="Description of property" value={r.inKindDescription ?? "—"} />
                <Row label="Fair market value" value={formatZAR(r.inKindFairValue ?? 0)} />
              </>
            ) : null}
            <Row label="Fund" value={r.fund.name} />
            <tr className="text-[13px] font-bold">
              <td className="border-t-2 border-black py-2.5">Amount received</td>
              <td className="tnum border-t-2 border-black py-2.5 text-right">
                {formatZAR(r.amount)}
              </td>
            </tr>
          </tbody>
        </table>

        <p className="mt-6 text-[11px] leading-relaxed">
          We hereby certify that this donation will be used solely in carrying
          on the public benefit activities of {s?.churchName ?? "the organisation"},
          as contemplated in Part II of the Ninth Schedule to the Income Tax
          Act, 1962. This receipt is issued in terms of section 18A(2)(a) of
          that Act.
        </p>

        <div className="mt-12 w-64">
          <div className="mb-1 h-8 border-b border-neutral-700" />
          <p className="text-[9.5px] tracking-wide text-neutral-600 uppercase">
            Duly authorised signatory
          </p>
          {r.issuedBy ? <p className="mt-0.5 text-[10.5px]">{r.issuedBy}</p> : null}
        </div>
      </PrintSheet>

      {!r.cancelled ? (
        <div className="no-print mx-auto mt-4 max-w-[820px]">
          <Card>
            <CardHeader
              title="Cancel this receipt"
              subtitle="The receipt stays in the register, marked cancelled — it is never deleted"
            />
            <form action={cancelReceipt.bind(null, r.id)}>
              <div className="p-5">
                <Field label="Reason">
                  <Input name="cancelledReason" required placeholder="e.g. Issued in error — duplicate" />
                </Field>
              </div>
              <div className="flex justify-end border-t px-5 py-3">
                <Button type="submit" variant="danger">Cancel receipt</Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="w-56 py-1.5 align-top text-neutral-600">{label}</td>
      <td className="py-1.5">{value}</td>
    </tr>
  );
}
