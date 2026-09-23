import "server-only";
import { db } from "@/lib/db";
import type { EventCategory } from "@/generated/prisma";

/**
 * Keep a ministry's activity on the church calendar.
 *
 * Children's church sessions, youth meetings and outreaches each own an Event,
 * created and updated with them, so the planner and the year wall chart show
 * everything that is on without anybody typing it in twice — and without two
 * copies drifting apart when a date moves.
 */
export async function syncLinkedEvent(
  eventId: string | null | undefined,
  e: {
    title: string;
    category: EventCategory;
    startsAt: Date;
    endsAt?: Date | null;
    location?: string | null;
    leader?: string | null;
    description?: string | null;
  },
): Promise<string> {
  const data = {
    title: e.title,
    category: e.category,
    startsAt: e.startsAt,
    endsAt: e.endsAt ?? null,
    location: e.location ?? null,
    leader: e.leader ?? null,
    description: e.description ?? null,
    deletedAt: null,
  };
  if (eventId) {
    const existing = await db.event.findUnique({ where: { id: eventId } });
    if (existing) {
      await db.event.update({ where: { id: eventId }, data });
      return eventId;
    }
  }
  const created = await db.event.create({ data });
  return created.id;
}

/** Take it off the calendar when the activity itself is removed. */
export async function removeLinkedEvent(eventId: string | null | undefined) {
  if (!eventId) return;
  await db.event.updateMany({ where: { id: eventId }, data: { deletedAt: new Date() } });
}

/** Read a date and an optional time from a form into one Date. */
export function dateTime(formData: FormData, dateKey: string, timeKey?: string): Date | null {
  const d = String(formData.get(dateKey) ?? "").trim();
  if (!d) return null;
  const t = timeKey ? String(formData.get(timeKey) ?? "").trim() : "";
  const v = new Date(t ? `${d}T${t}` : `${d}T00:00`);
  return Number.isNaN(v.getTime()) ? null : v;
}

export function text(formData: FormData, key: string) {
  const v = formData.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

export function int(formData: FormData, key: string) {
  const s = text(formData, key);
  if (!s) return null;
  const n = parseInt(s.replace(/\D/g, ""), 10);
  return Number.isNaN(n) ? null : n;
}

export function money(formData: FormData, key: string) {
  const s = text(formData, key);
  if (!s) return null;
  const n = Number(s.replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isNaN(n) ? null : n;
}
