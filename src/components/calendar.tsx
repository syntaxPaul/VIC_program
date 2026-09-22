"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import { CATEGORY_COLOR } from "@/lib/event-colors";

// re-exported so existing imports keep working
export { CATEGORY_COLOR };

export type CalEvent = {
  id: string;
  title: string;
  category: string;
  startsAt: string;
  allDay: boolean;
  location: string | null;
};


const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthCalendar({
  year,
  month,
  events,
}: {
  year: number;
  month: number; // 0-indexed
  events: CalEvent[];
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  // Monday-first grid
  const leading = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: last.getDate() }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const byDay = new Map<string, CalEvent[]>();
  for (const e of events) {
    const d = new Date(e.startsAt);
    const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }

  function go(delta: number) {
    const d = new Date(year, month + delta, 1);
    const q = new URLSearchParams(sp.toString());
    q.set("y", String(d.getFullYear()));
    q.set("m", String(d.getMonth()));
    router.push(`/planner?${q}`);
  }

  const monthLabel = new Intl.DateTimeFormat("en-ZA", {
    month: "long",
    year: "numeric",
  }).format(first);

  const todayKey = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`;
  })();

  return (
    <div>
      <div className="no-print mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold">{monthLabel}</h2>
        <div className="flex items-center gap-1.5">
          <Button size="sm" onClick={() => go(-1)} aria-label="Previous month">
            <ChevronLeft size={15} />
          </Button>
          <Button size="sm" onClick={() => router.push("/planner")}>Today</Button>
          <Button size="sm" onClick={() => go(1)} aria-label="Next month">
            <ChevronRight size={15} />
          </Button>
        </div>
      </div>

      <h2 className="print-only mb-3 text-center text-[15px] font-semibold">{monthLabel}</h2>

      <div className="overflow-hidden rounded-xl border">
        <div className="grid grid-cols-7 border-b bg-sand-50 dark:bg-sand-800/50">
          {DAYS.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center text-[11.5px] font-semibold tracking-wide text-[var(--text-muted)] uppercase"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const key = d ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : `x${i}`;
            const dayEvents = d ? (byDay.get(key) ?? []) : [];
            const isToday = key === todayKey;

            return (
              <div
                key={key}
                className={`avoid-break min-h-[104px] border-r border-b p-1.5 last:border-r-0 ${
                  d ? "" : "bg-sand-50/60 dark:bg-sand-900/40"
                }`}
              >
                {d ? (
                  <>
                    <div className="mb-1 flex justify-end">
                      <span
                        className={`tnum flex h-5 w-5 items-center justify-center rounded-full text-[11.5px] ${
                          isToday
                            ? "bg-bronze-600 font-semibold text-white"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        {d.getDate()}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((e) => (
                        <div
                          key={e.id}
                          className="exact-color truncate rounded px-1.5 py-0.5 text-[10.5px] leading-tight text-white"
                          style={{ background: CATEGORY_COLOR[e.category] ?? CATEGORY_COLOR.OTHER }}
                          title={`${e.title}${e.location ? ` · ${e.location}` : ""}`}
                        >
                          {!e.allDay
                            ? `${new Date(e.startsAt).getHours().toString().padStart(2, "0")}:${new Date(e.startsAt).getMinutes().toString().padStart(2, "0")} `
                            : ""}
                          {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 ? (
                        <div className="px-1.5 text-[10.5px] text-[var(--text-muted)]">
                          +{dayEvents.length - 3} more
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
