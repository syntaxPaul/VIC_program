import * as React from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui";

/**
 * The parts every office's home screen is built from.
 *
 * Each role sees a different set of these, arranged around what that office
 * actually does on a Monday morning — not the same dashboard with some cards
 * hidden.
 */

export function Panel({
  title,
  subtitle,
  href,
  hrefLabel,
  empty,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
  empty?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const hasChildren = React.Children.toArray(children).some(Boolean);
  return (
    <Card className={className}>
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={
          href ? (
            <Link
              href={href}
              className="text-[12.5px] font-medium text-bronze-600 hover:underline dark:text-bronze-300"
            >
              {hrefLabel ?? "See all"}
            </Link>
          ) : undefined
        }
      />
      {hasChildren ? (
        <div className="divide-y">{children}</div>
      ) : (
        <p className="px-5 py-6 text-center text-[13px] text-[var(--text-muted)]">
          {empty ?? "Nothing here."}
        </p>
      )}
    </Card>
  );
}

export function Row({
  href,
  title,
  meta,
  right,
  tone,
}: {
  href?: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  right?: React.ReactNode;
  tone?: "warning" | "danger";
}) {
  const body = (
    <div className="flex items-center justify-between gap-3 px-5 py-2.5">
      <div className="min-w-0">
        <p
          className={`truncate text-[13.5px] ${
            tone === "danger" ? "text-danger" : tone === "warning" ? "text-bronze-700 dark:text-bronze-300" : ""
          }`}
        >
          {title}
        </p>
        {meta ? (
          <p className="truncate text-[12px] text-[var(--text-muted)]">{meta}</p>
        ) : null}
      </div>
      {right ? (
        <span className="shrink-0 text-[12.5px] text-[var(--text-muted)]">{right}</span>
      ) : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block hover:bg-sand-100/60 dark:hover:bg-sand-800/40">
      {body}
    </Link>
  ) : (
    body
  );
}

/** A stage in a pipeline — used for the road from enquiry to baptism. */
export function Stage({
  label,
  count,
  href,
  accent,
}: {
  label: string;
  count: number;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-1 flex-col gap-1 rounded-xl border px-4 py-3 transition-colors hover:border-bronze-300 ${
        accent ? "bg-bronze-50/60 dark:bg-bronze-900/10" : "bg-[var(--card)]"
      }`}
    >
      <span className="text-[24px] leading-none font-semibold tabular-nums">{count}</span>
      <span className="text-[12.5px] leading-snug text-[var(--text-muted)]">{label}</span>
    </Link>
  );
}

/** A single figure with a word of context, for the quieter offices. */
export function Figure({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="px-5 py-3">
      <p className="text-[11.5px] tracking-wide text-[var(--text-muted)] uppercase">{label}</p>
      <p className="mt-0.5 text-[18px] font-semibold tabular-nums">{value}</p>
      {note ? <p className="text-[12px] text-[var(--text-muted)]">{note}</p> : null}
    </div>
  );
}
