"use client";

import * as React from "react";
import { Check, Save, Search, Users, X } from "lucide-react";
import { Button, Card, CardHeader, Input } from "@/components/ui";
import { initials } from "@/lib/format";

type Row = {
  id: string;
  fullName: string;
  memberNumber: string;
  ministry: string | null;
  present: boolean;
};

export function AttendanceRegister({
  action,
  members,
}: {
  action: (formData: FormData) => void;
  members: Row[];
}) {
  const [state, setState] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(members.map((m) => [m.id, m.present])),
  );
  const [q, setQ] = React.useState("");

  const visible = React.useMemo(() => {
    const needle = q.toLowerCase().trim();
    if (!needle) return members;
    return members.filter(
      (m) =>
        m.fullName.toLowerCase().includes(needle) ||
        m.memberNumber.toLowerCase().includes(needle),
    );
  }, [members, q]);

  const presentCount = Object.values(state).filter(Boolean).length;

  function setAll(value: boolean) {
    setState((s) => {
      const next = { ...s };
      for (const m of visible) next[m.id] = value;
      return next;
    });
  }

  return (
    <form action={action}>
      {members.map((m) => (
        <input key={m.id} type="hidden" name="member" value={m.id} />
      ))}
      {Object.entries(state)
        .filter(([, v]) => v)
        .map(([id]) => (
          <input key={id} type="hidden" name="present" value={id} />
        ))}

      <Card className="overflow-hidden">
        <CardHeader
          title="Who attended"
          subtitle={`${presentCount} of ${members.length} marked present`}
          action={
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={() => setAll(true)}>
                <Check size={13} /> All
              </Button>
              <Button type="button" size="sm" onClick={() => setAll(false)}>
                <X size={13} /> None
              </Button>
            </div>
          }
        />

        <div className="border-b p-3">
          <div className="relative">
            <Search
              size={15}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Find a member…"
              className="pl-9"
            />
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="px-5 py-12 text-center text-[13px] text-[var(--text-muted)]">
            No members match “{q}”.
          </p>
        ) : (
          <ul className="grid gap-px bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((m) => {
              const on = state[m.id] ?? false;
              return (
                <li key={m.id} className="bg-[var(--card)]">
                  <label
                    className={`flex cursor-pointer items-center gap-2.5 px-4 py-2.5 transition-colors select-none ${
                      on ? "bg-success-bg/60 dark:bg-success/10" : "hover:bg-sand-50 dark:hover:bg-sand-800/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) =>
                        setState((s) => ({ ...s, [m.id]: e.target.checked }))
                      }
                      className="h-4 w-4 shrink-0 accent-[var(--brand)]"
                    />
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold ${
                        on
                          ? "bg-success text-white"
                          : "bg-sand-100 text-sand-600 dark:bg-sand-800 dark:text-sand-300"
                      }`}
                    >
                      {initials(m.fullName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px]">{m.fullName}</span>
                      <span className="tnum block text-[11.5px] text-[var(--text-muted)]">
                        {m.memberNumber}
                        {m.ministry ? ` · ${m.ministry}` : ""}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-[var(--card)]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] 2xl:max-w-[1760px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <p className="flex items-center gap-2 text-[13px]">
            <Users size={15} className="text-[var(--text-muted)]" />
            <span className="tnum font-semibold">{presentCount}</span>
            <span className="text-[var(--text-muted)]">present</span>
          </p>
          <Button type="submit" variant="primary">
            <Save size={15} /> Save register
          </Button>
        </div>
      </div>
      <div className="h-16" />
    </form>
  );
}
