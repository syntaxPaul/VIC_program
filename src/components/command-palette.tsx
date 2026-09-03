"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav-config";

type Result = { label: string; href: string; hint?: string; icon: string };

export function CommandPalette({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
}) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [cursor, setCursor] = React.useState(0);
  const [remote, setRemote] = React.useState<Result[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setQ("");
      setCursor(0);
      setRemote([]);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  // member / asset lookup
  React.useEffect(() => {
    if (!open || q.trim().length < 2) {
      setRemote([]);
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: ctl.signal,
        });
        if (res.ok) setRemote(await res.json());
      } catch {}
    }, 160);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q, open]);

  const navResults: Result[] = React.useMemo(() => {
    const needle = q.toLowerCase().trim();
    return items
      .filter((i) => !needle || i.label.toLowerCase().includes(needle))
      .map((i) => ({ label: i.label, href: i.href, icon: i.icon, hint: "Page" }));
  }, [items, q]);

  const results = React.useMemo(
    () => [...navResults, ...remote].slice(0, 12),
    [navResults, remote],
  );

  React.useEffect(() => {
    setCursor(0);
  }, [q]);

  if (!open) return null;

  function go(r: Result) {
    onClose();
    router.push(r.href);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 px-4 pt-[12vh] backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="animate-fade-up w-full max-w-lg overflow-hidden rounded-xl border bg-[var(--card)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b px-4">
          <Icons.Search size={16} className="text-[var(--text-muted)]" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, results.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              }
              if (e.key === "Enter" && results[cursor]) {
                e.preventDefault();
                go(results[cursor]);
              }
            }}
            placeholder="Jump to a page, member or asset…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-sand-400"
          />
          <kbd className="rounded border px-1.5 py-0.5 text-[10.5px] text-[var(--text-muted)]">
            esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-[var(--text-muted)]">
              No matches for “{q}”
            </p>
          ) : (
            results.map((r, i) => {
              const C = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[r.icon];
              return (
                <button
                  key={`${r.href}-${i}`}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => go(r)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13.5px]",
                    i === cursor ? "bg-bronze-600/10" : "hover:bg-sand-100 dark:hover:bg-sand-800",
                  )}
                >
                  <span className="text-[var(--text-muted)]">{C ? <C size={15} /> : null}</span>
                  <span className="flex-1 truncate">{r.label}</span>
                  {r.hint ? (
                    <span className="text-[11.5px] text-[var(--text-muted)]">{r.hint}</span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
