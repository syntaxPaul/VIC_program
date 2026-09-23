import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireArea } from "@/lib/guards";
import { formatDate, formatDateCeremonial } from "@/lib/format";
import { PrintBar } from "@/components/print-sheet";
import { LogoFull } from "@/components/logo";

export default async function ConsecrationCertificate({ params }: { params: Promise<{ id: string }> }) {
  await requireArea("sacraments");
  const { id } = await params;
  const [c, s] = await Promise.all([
    db.consecration.findFirst({ where: { id, deletedAt: null } }),
    db.settings.findFirst(),
  ]);
  if (!c) notFound();

  if (c.status !== "CONSECRATED" || !c.consecrationDate) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="font-serif text-[24px] font-semibold">Not yet consecrated</h1>
        <p className="mt-2 text-[14px] text-[var(--text-muted)]">
          A certificate can only be printed once {c.childName} has been consecrated and the date recorded.
        </p>
        <Link href={`/consecrations/${c.id}`} className="mt-6 inline-block text-[13px] text-bronze-600 hover:underline">← Back</Link>
      </div>
    );
  }

  const church = s?.churchName ?? "Victory in Christ";
  const parents = [c.fatherName, c.motherName].filter(Boolean).join(" and ") || c.guardianName;

  return (
    <>
      <PrintBar backHref={`/consecrations/${c.id}`} label="Print certificate" />
      <div className="print-sheet exact-color mx-auto bg-white text-black shadow-sm" style={{ maxWidth: 1050 }}>
        <div className="relative p-3">
          <div className="border-[3px] border-[#C7A86D] p-1.5">
            <div className="border border-[#C7A86D] px-5 py-10 text-center sm:px-14 sm:py-12">
              <div className="exact-color mx-auto mb-2 flex justify-center">
                <LogoFull width={210} alt={church} />
              </div>
              <h1 className="mt-6 font-serif text-[30px] leading-none font-semibold tracking-wide text-[#7A5C2E] sm:text-[40px]">
                Certificate of Consecration
              </h1>
              <div className="mx-auto mt-3 h-px w-40 bg-[#C7A86D]" />
              <p className="mt-8 text-[13px] text-neutral-600">This is to certify that</p>
              <p className="font-serif mt-2 border-b border-neutral-300 pb-2 text-[28px] leading-tight font-semibold sm:text-[34px]">
                {c.childName}
              </p>
              {c.childDob ? <p className="mt-2 text-[12px] text-neutral-600">born {formatDateCeremonial(c.childDob)}</p> : null}
              <p className="mx-auto mt-7 max-w-2xl text-[13.5px] leading-[1.9] text-neutral-800">
                {parents ? <>child of {parents}, </> : null}
                was presented and dedicated to the Lord before the congregation of {church}
                {c.place ? ` at ${c.place}` : ""} on the{" "}
                <span className="font-medium">{formatDateCeremonial(c.consecrationDate)}</span>.
              </p>
              <p className="mt-6 font-serif text-[12.5px] text-neutral-600 italic">
                “For this child I prayed; and the Lord hath given me my petition which I asked of him:
                therefore also I have lent him to the Lord.”
                <span className="mt-0.5 block not-italic">— {c.scripture ?? "1 Samuel 1:27–28"}</span>
              </p>
              <div className="mt-14 flex flex-wrap items-end justify-center gap-10">
                {c.officiant ? (
                  <div className="w-48">
                    <p className="font-serif mb-1 text-[13px] italic">{c.officiant}</p>
                    <div className="border-t border-neutral-700" />
                    <p className="mt-1 text-[9.5px] tracking-wide text-neutral-600 uppercase">Officiating Minister</p>
                  </div>
                ) : null}
                {c.witnesses ? (
                  <div className="w-48">
                    <p className="font-serif mb-1 text-[13px] italic">{c.witnesses}</p>
                    <div className="border-t border-neutral-700" />
                    <p className="mt-1 text-[9.5px] tracking-wide text-neutral-600 uppercase">Witness</p>
                  </div>
                ) : null}
              </div>
              <div className="mt-10 flex items-end justify-between text-[9.5px] text-neutral-500">
                <span className="tnum">Register no. {c.registerNumber ?? "—"}</span>
                <span className="tnum">Issued {formatDate(c.certificateIssuedAt ?? new Date())}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
