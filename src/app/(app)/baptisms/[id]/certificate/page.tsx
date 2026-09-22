import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateCeremonial, formatDate } from "@/lib/format";
import { PrintBar } from "@/components/print-sheet";
import { LogoFull } from "@/components/logo";

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [b, s] = await Promise.all([
    db.baptism.findFirst({ where: { id, deletedAt: null } }),
    db.settings.findFirst(),
  ]);

  if (!b) notFound();

  // A certificate states that a baptism took place. Reaching this page for a
  // candidate who has not yet been baptised would print one with the date and
  // register number blank — a document that should not exist, and one that
  // could be signed by hand later. The button that leads here is only shown
  // for a completed baptism; this guards the URL itself.
  if (b.status !== "BAPTISED" || !b.baptismDate) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="font-serif text-[24px] font-semibold">Not yet baptised</h1>
        <p className="mt-2 text-[14px] text-[var(--text-muted)]">
          A certificate can only be printed once {b.fullName}&rsquo;s baptism has
          taken place and the date has been recorded.
        </p>
        <Link
          href={`/baptisms/${b.id}`}
          className="mt-6 inline-block text-[13px] text-bronze-600 hover:underline dark:text-bronze-300"
        >
          ← Back to the record
        </Link>
      </div>
    );
  }

  const church = s?.churchName ?? "Victory in Christ";
  const place = b.placeOfBaptism ?? s?.city ?? "";
  const isDuplicate = b.certificateReissueCount > 0;

  return (
    <>
      <PrintBar backHref={`/baptisms/${b.id}`} label="Print certificate" />

      <div
        className="print-sheet exact-color mx-auto bg-white text-black shadow-sm"
        style={{ maxWidth: 1050 }}
      >
        <div className="relative p-3">
          {/* decorative double border */}
          <div className="border-[3px] border-[#C7A86D] p-1.5">
            <div className="border border-[#C7A86D] px-14 py-12 text-center">
              {isDuplicate ? (
                <p className="absolute top-8 right-10 rotate-6 border border-neutral-400 px-2 py-0.5 text-[10px] tracking-widest text-neutral-500 uppercase">
                  Duplicate copy
                </p>
              ) : null}

              <div className="exact-color mx-auto mb-2 flex justify-center">
                <LogoFull width={230} alt={church} />
              </div>

              <h1 className="mt-6 font-serif text-[40px] leading-none font-semibold tracking-wide text-[#7A5C2E]">
                Certificate of Baptism
              </h1>

              <div className="mx-auto mt-3 h-px w-40 bg-[#C7A86D]" />

              <p className="mt-8 text-[13px] text-neutral-600">This is to certify that</p>

              <p className="font-serif mt-2 border-b border-neutral-300 pb-2 text-[34px] leading-tight font-semibold">
                {b.fullName}
              </p>

              <p className="mx-auto mt-7 max-w-2xl text-[13.5px] leading-[1.9] text-neutral-800">
                having professed faith in the Lord Jesus Christ, was baptised
                {b.mode ? ` by ${b.mode.toLowerCase()}` : ""} in the name of the
                Father, and of the Son, and of the Holy Spirit,
                {place ? ` at ${place},` : ""} on the{" "}
                <span className="font-medium">{formatDateCeremonial(b.baptismDate)}</span>.
              </p>

              {b.scriptureVerse ? (
                <p className="mt-6 font-serif text-[12.5px] text-neutral-600 italic">
                  “Therefore we are buried with him by baptism into death: that
                  like as Christ was raised up from the dead by the glory of the
                  Father, even so we also should walk in newness of life.”
                  <span className="mt-0.5 block not-italic">— {b.scriptureVerse}</span>
                </p>
              ) : null}

              {/* signature block */}
              <div className="mt-14 flex items-end justify-center gap-10">
                <SignatureLine label="Officiating Minister" name={b.officiant} />
                <SignatureLine label="Witness" name={b.witness1} />
                <SignatureLine label="Witness" name={b.witness2} />
              </div>

              <div className="mt-10 flex items-end justify-between text-[9.5px] text-neutral-500">
                <span className="tnum">
                  Register no. {b.registerNumber ?? "—"}
                </span>
                <span className="tnum">
                  Issued {formatDate(b.certificateIssuedAt ?? new Date())}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function SignatureLine({ label, name }: { label: string; name: string | null }) {
  if (!name) return null;
  return (
    <div className="w-48">
      <p className="font-serif mb-1 text-[13px] italic">{name}</p>
      <div className="border-t border-neutral-700" />
      <p className="mt-1 text-[9.5px] tracking-wide text-neutral-600 uppercase">{label}</p>
    </div>
  );
}
