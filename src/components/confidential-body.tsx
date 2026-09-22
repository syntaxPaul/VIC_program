"use client";

import * as React from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

/**
 * A confidential note's text stays hidden until it is asked for, so that a
 * shared or projected screen does not give away a counselling matter that
 * happens to be on the page.
 */
export function ConfidentialBody({ children }: { children: string }) {
  const [shown, setShown] = React.useState(false);

  if (shown) {
    return (
      <div>
        <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap">{children}</p>
        <button
          onClick={() => setShown(false)}
          className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <EyeOff size={13} /> Hide again
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShown(true)}
      className="flex w-full items-center gap-2.5 rounded-lg border border-dashed px-3 py-3 text-left text-[13px] text-[var(--text-muted)] transition-colors hover:border-bronze-400 hover:text-[var(--text)]"
    >
      <Lock size={14} className="shrink-0 text-warning" />
      <span className="flex-1">Confidential — hidden until you choose to read it</span>
      <span className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-medium">
        <Eye size={13} /> Show
      </span>
    </button>
  );
}
