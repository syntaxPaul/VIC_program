import * as React from "react";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

/**
 * One large number, one comparison line, one indicator. The gap
 * (actual vs target) is what carries the conditional colour — never
 * the headline number.
 */
export function KpiTile({
  label,
  value,
  comparison,
  delta,
  goodDirection = "up",
  icon,
  accent,
}: {
  label: string;
  value: string;
  comparison?: string;
  delta?: number | null;
  goodDirection?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const isFlat = hasDelta && Math.abs(delta) < 0.05;
  const isGood =
    !hasDelta || goodDirection === "neutral" || isFlat
      ? null
      : goodDirection === "up"
        ? delta > 0
        : delta < 0;

  return (
    <div
      className={cn(
        "rounded-xl border bg-[var(--card)] p-4 shadow-[0_1px_2px_rgba(47,42,36,.04)]",
        accent && "border-bronze-300/60 bg-bronze-50/40 dark:bg-bronze-600/10",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12.5px] font-medium text-[var(--text-muted)]">{label}</p>
        {icon ? <span className="text-sand-400">{icon}</span> : null}
      </div>

      <p className="tnum mt-2 text-[27px] leading-none font-semibold tracking-tight">
        {value}
      </p>

      {(comparison || hasDelta) && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[12.5px]">
          {hasDelta ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium tnum",
                isGood === null && "text-[var(--text-muted)]",
                isGood === true && "text-success",
                isGood === false && "text-danger",
              )}
            >
              {isFlat ? (
                <Minus size={13} />
              ) : delta > 0 ? (
                <ArrowUpRight size={13} />
              ) : (
                <ArrowDownRight size={13} />
              )}
              {Math.abs(delta).toFixed(1).replace(".", ",")}%
            </span>
          ) : null}
          {comparison ? (
            <span className="text-[var(--text-muted)]">{comparison}</span>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(215px,1fr))]">
      {children}
    </div>
  );
}
