import * as React from "react";
import Link from "next/link";
import { eventColor } from "@/lib/event-colors";

export type YearEvent = {
  id: string;
  title: string;
  category: string;
  startsAt: Date;
  location: string | null;
};

const WEEKDAY_LETTER = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function key(d: Date) {
  return `${d.getMonth()}-${d.getDate()}`;
}

/**
 * The wall chart: twelve months down, the days of the month across.
 *
 * A church's year is read by shape — which weeks are full, where the empty
 * stretch before the conference is, whether two ministries have booked the
 * same Saturday. Names of events do not fit in a 9mm cell and pretending
 * otherwise produces a chart nobody can read from across the office, so the
 * grid carries colour and the dated list underneath carries the words.
 */
export function YearWallChart({
  year,
  events,
  dense = false,
  linkMonths = false,
  todayDate,
}: {
  year: number;
  events: YearEvent[];
  /** Tighter type and spacing, for the printed sheet. */
  dense?: boolean;
  /** On screen, each month label opens that month in the planner. */
  linkMonths?: boolean;
  todayDate?: Date;
}) {
  const byDay = new Map<string, YearEvent[]>();
  for (const e of events) {
    const k = key(e.startsAt);
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }

  const todayKey =
    todayDate && todayDate.getFullYear() === year ? key(todayDate) : null;

  // The printed chart is sized to fill an A4 landscape sheet: a wall chart
  // that uses a third of the page is a wall chart nobody reads from a desk
  // away, let alone across the office.
  const cell = dense ? "h-[30px] text-[8px]" : "h-[26px] text-[9px]";
  const head = dense ? "text-[7px]" : "text-[9px]";
  const label = dense ? "text-[9px]" : "text-[11px]";

  return (
    <table className="w-full table-fixed border-collapse">
      <colgroup>
        <col style={{ width: dense ? "7%" : "8%" }} />
        {Array.from({ length: 31 }, (_, i) => (
          <col key={i} style={{ width: `${(dense ? 93 : 92) / 31}%` }} />
        ))}
      </colgroup>

      <thead>
        <tr>
          <th />
          {Array.from({ length: 31 }, (_, i) => (
            <th
              key={i}
              className={`border-b border-neutral-300 pb-0.5 text-center font-medium text-neutral-500 ${head}`}
            >
              {i + 1}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {MONTHS.map((name, m) => {
          const days = new Date(year, m + 1, 0).getDate();
          return (
            <tr key={name}>
              <th
                className={`border-r border-neutral-300 pr-1.5 text-right align-middle font-medium whitespace-nowrap ${label}`}
              >
                {linkMonths ? (
                  <Link
                    href={`/planner?y=${year}&m=${m}`}
                    className="hover:text-bronze-600 hover:underline"
                  >
                    {dense ? name.slice(0, 3) : name}
                  </Link>
                ) : (
                  <span>{dense ? name.slice(0, 3) : name}</span>
                )}
              </th>

              {Array.from({ length: 31 }, (_, i) => {
                const day = i + 1;
                if (day > days) {
                  return (
                    <td
                      key={day}
                      className={`border border-neutral-200 bg-neutral-100 ${cell}`}
                    />
                  );
                }

                const date = new Date(year, m, day);
                const weekday = date.getDay();
                const isSunday = weekday === 0;
                const k = `${m}-${day}`;
                const dayEvents = byDay.get(k) ?? [];
                const isToday = todayKey === k;

                return (
                  <td
                    key={day}
                    title={
                      dayEvents.length
                        ? dayEvents.map((e) => e.title).join(" · ")
                        : undefined
                    }
                    className={`exact-color relative border border-neutral-200 text-center align-middle ${cell} ${
                      isSunday && !dayEvents.length ? "bg-bronze-50" : ""
                    } ${isToday ? "outline outline-2 -outline-offset-2 outline-black" : ""}`}
                    style={
                      dayEvents.length
                        ? {
                            backgroundColor: eventColor(dayEvents[0].category),
                            color: "#fff",
                          }
                        : undefined
                    }
                  >
                    <span
                      className={dayEvents.length ? "font-semibold" : "text-neutral-400"}
                    >
                      {WEEKDAY_LETTER[weekday]}
                    </span>
                    {dayEvents.length > 1 ? (
                      // more than one thing booked that day — the count is
                      // what tells the secretary to go and look at the month
                      <span
                        className="exact-color absolute top-0 right-[1px] leading-none"
                        style={{ fontSize: dense ? 6 : 7 }}
                      >
                        {dayEvents.length}
                      </span>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** The words the grid cannot hold: every event, by month, with its date. */
export function YearKeyDates({
  year,
  events,
  dense = false,
  columns = 3,
}: {
  year: number;
  events: YearEvent[];
  dense?: boolean;
  columns?: number;
}) {
  const byMonth = new Map<number, YearEvent[]>();
  for (const e of events) {
    const m = e.startsAt.getMonth();
    byMonth.set(m, [...(byMonth.get(m) ?? []), e]);
  }

  const size = dense ? "text-[7px]" : "text-[12px]";

  if (events.length === 0) {
    return (
      <p className={`text-neutral-500 ${size}`}>
        Nothing is on the calendar for {year} yet.
      </p>
    );
  }

  return (
    <div
      // On screen a phone gets one column and wider screens get `columns`;
      // the printed sheet (dense) always keeps its columns.
      className={dense ? size : `${size} columns-1 sm:[column-count:var(--cols)]`}
      style={
        dense
          ? { columnCount: columns, columnGap: "14px" }
          : ({ "--cols": columns, columnGap: "24px" } as React.CSSProperties)
      }
    >
      {MONTHS.map((name, m) => {
        const list = byMonth.get(m);
        if (!list?.length) return null;
        return (
          <div key={name} className="mb-2.5 break-inside-avoid">
            <p className="mb-0.5 border-b border-neutral-300 pb-0.5 font-semibold">
              {name}
            </p>
            {list.map((e) => (
              <p key={e.id} className="flex gap-1.5 leading-snug">
                <span className="tnum w-5 shrink-0 text-right text-neutral-500">
                  {e.startsAt.getDate()}
                </span>
                <span
                  className="exact-color mt-[0.45em] h-[5px] w-[5px] shrink-0 rounded-full"
                  style={{ backgroundColor: eventColor(e.category) }}
                />
                <span>
                  {e.title}
                  {e.location ? (
                    <span className="text-neutral-500"> · {e.location}</span>
                  ) : null}
                </span>
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/** Which colour means what — the chart is unreadable without it. */
export function YearLegend({
  categories,
  dense = false,
}: {
  categories: string[];
  dense?: boolean;
}) {
  if (!categories.length) return null;
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${
        dense ? "text-[7px]" : "text-[11px]"
      }`}
    >
      {categories.map((c) => (
        <span key={c} className="flex items-center gap-1">
          <span
            className="exact-color inline-block h-[7px] w-[7px] rounded-full"
            style={{ backgroundColor: eventColor(c) }}
          />
          <span className="text-neutral-600">
            {c.charAt(0) + c.slice(1).toLowerCase().replace("_", " ")}
          </span>
        </span>
      ))}
    </div>
  );
}
