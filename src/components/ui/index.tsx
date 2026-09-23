import * as React from "react";
import { cn } from "@/lib/utils";

/* ── Card ─────────────────────────────────────────────────────────── */
export function Card({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-[var(--card)] shadow-[0_1px_2px_rgba(47,42,36,.04)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b px-5 py-4", className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ── Button ───────────────────────────────────────────────────────── */
type ButtonProps = React.ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-[13px]" : "h-9 px-4 text-sm",
        variant === "primary" &&
          "bg-bronze-600 text-white hover:bg-bronze-700 dark:bg-bronze-500 dark:hover:bg-bronze-600",
        variant === "secondary" &&
          "border bg-[var(--card)] hover:bg-sand-100 dark:hover:bg-sand-800",
        variant === "ghost" && "hover:bg-sand-100 dark:hover:bg-sand-800",
        variant === "danger" && "bg-danger text-white hover:opacity-90",
        className,
      )}
      {...props}
    />
  );
}

/* ── Badge ────────────────────────────────────────────────────────── */
const TONES = {
  neutral: "bg-sand-100 text-sand-700 dark:bg-sand-800 dark:text-sand-200",
  success: "bg-success-bg text-success dark:bg-success/15 dark:text-success",
  warning: "bg-warning-bg text-warning dark:bg-warning/15 dark:text-warning",
  danger: "bg-danger-bg text-danger dark:bg-danger/15 dark:text-danger",
  info: "bg-info-bg text-info dark:bg-info/15 dark:text-info",
  brand: "bg-bronze-50 text-bronze-700 dark:bg-bronze-600/20 dark:text-bronze-300",
} as const;

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: keyof typeof TONES;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── Form controls ────────────────────────────────────────────────── */
export function Field({
  label,
  hint,
  error,
  optional,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-baseline gap-2 text-[13px] font-medium">
        {label}
        {optional ? (
          <span className="text-[11.5px] font-normal text-[var(--text-muted)]">optional</span>
        ) : null}
      </span>
      {children}
      {hint && !error ? (
        <span className="mt-1 block text-[12px] text-[var(--text-muted)]">{hint}</span>
      ) : null}
      {error ? <span className="mt-1 block text-[12px] text-danger">{error}</span> : null}
    </label>
  );
}

// 16px on a phone, 14px from sm up. Safari on iPhone zooms the whole page in
// when you tap a field whose text is smaller than 16px, and does not zoom back
// out — which is what made the sign-in page and every form look broken on a
// phone: the page was suddenly wider than the screen.
const controlBase =
  "w-full rounded-lg border bg-[var(--card)] px-3 text-base outline-none transition-colors placeholder:text-sand-400 focus:border-bronze-500 disabled:opacity-60 sm:text-sm";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(controlBase, "h-11 sm:h-9", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(controlBase, "py-2 leading-relaxed", className)} rows={4} {...props} />;
}

export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select className={cn(controlBase, "h-11 pr-8 sm:h-9", className)} {...props}>
      {children}
    </select>
  );
}

/* ── Table ────────────────────────────────────────────────────────── */
/**
 * A table that turns into a list of cards on a phone.
 *
 * A six-column register cannot be made to fit 390 pixels, and sideways
 * scrolling inside a page is the worst of the options — you cannot tell there
 * is more, and you lose your place going back. Below the `sm` breakpoint the
 * `stacked-table` rules in globals.css turn every row into a card and every
 * cell into a labelled line. Pass `label` to each Td so the value keeps its
 * meaning once the column heading is gone.
 */
export function TableWrap({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("w-full sm:overflow-x-auto", className)}>
      <table className="stacked-table w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({
  className,
  numeric,
  children,
  ...props
}: React.ComponentProps<"th"> & { numeric?: boolean }) {
  return (
    <th
      className={cn(
        "border-b bg-[var(--card)] px-4 py-2.5 text-[12px] font-semibold tracking-wide text-[var(--text-muted)] uppercase",
        numeric ? "text-right" : "text-left",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({
  className,
  numeric,
  label,
  children,
  ...props
}: React.ComponentProps<"td"> & { numeric?: boolean; label?: string }) {
  return (
    <td
      data-label={label}
      className={cn(
        "border-b px-4 py-2.5 align-middle",
        numeric && "text-right tnum",
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}

/* ── Empty state ──────────────────────────────────────────────────── */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon ? (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-sand-100 text-sand-500 dark:bg-sand-800">
          {icon}
        </div>
      ) : null}
      <p className="text-[15px] font-medium">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-[13px] text-[var(--text-muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/* ── Page header ──────────────────────────────────────────────────── */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-[13.5px] text-[var(--text-muted)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
