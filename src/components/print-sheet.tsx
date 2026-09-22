import * as React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { PrintButton } from "./print-button";
import { LogoFull } from "./logo";
import { formatDate } from "@/lib/format";

/**
 * Shared A4 document shell. Every printed report carries a header band
 * (church, registration numbers, report title, period) and a footer
 * band (generated on / by) — a report without a period label is useless
 * in a council meeting.
 */
export async function PrintSheet({
  title,
  period,
  subtitle,
  generatedBy,
  landscape,
  children,
}: {
  title: string;
  period?: string;
  subtitle?: string;
  generatedBy?: string;
  landscape?: boolean;
  children: React.ReactNode;
}) {
  const s = await db.settings.findFirst();

  const registrations = [
    s?.isNpoRegistered && s.npoNumber ? `NPO ${s.npoNumber}` : null,
    s?.isPboApproved && s.pboNumber ? `PBO ${s.pboNumber}` : null,
    s?.is18aApproved && s.section18aNumber ? `S18A ${s.section18aNumber}` : null,
  ].filter(Boolean);

  return (
    <div
      className={`print-sheet mx-auto bg-white p-10 text-black shadow-sm dark:bg-white ${
        landscape ? "max-w-[1120px]" : "max-w-[820px]"
      }`}
      style={landscape ? { page: "landscape" } as React.CSSProperties : undefined}
    >
      <header className="mb-6 border-b-2 border-black pb-4">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="exact-color mb-1.5">
              <LogoFull width={168} alt={s?.churchName ?? "Victory in Christ"} />
            </div>
            <h1 className="sr-only">{s?.churchName ?? "Victory in Christ"}</h1>
            <p className="mt-1 text-[11px] leading-snug text-neutral-600">
              {[s?.addressLine1, s?.city, s?.province, s?.postalCode].filter(Boolean).join(", ")}
              {s?.phone ? ` · ${s.phone}` : ""}
            </p>
            {registrations.length > 0 ? (
              <p className="text-[11px] text-neutral-600">{registrations.join(" · ")}</p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-[15px] font-semibold">{title}</p>
            {period ? <p className="text-[12px] text-neutral-700">{period}</p> : null}
            {subtitle ? <p className="text-[11px] text-neutral-600">{subtitle}</p> : null}
          </div>
        </div>
      </header>

      <div className="text-[12px]">{children}</div>

      <footer className="mt-8 flex items-center justify-between border-t pt-3 text-[10px] text-neutral-500">
        <span>
          Generated on {formatDate(new Date())}
          {generatedBy ? ` by ${generatedBy}` : ""}
        </span>
        <span>{s?.churchName ?? "Victory in Christ"}</span>
      </footer>
    </div>
  );
}

/** Print / back controls, hidden on the printed page. */
export function PrintBar({
  backHref,
  label,
}: {
  backHref: string;
  label?: string;
}) {
  return (
    <div className="no-print mx-auto mb-4 flex max-w-[1120px] items-center justify-between gap-3 px-2">
      <Link
        href={backHref}
        className="text-[13px] font-medium text-bronze-600 hover:underline dark:text-bronze-300"
      >
        ← Back
      </Link>
      <PrintButton label={label} />
    </div>
  );
}
