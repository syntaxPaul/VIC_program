"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireArea } from "@/lib/guards";
import { dateTime, int, money, removeLinkedEvent, syncLinkedEvent, text } from "@/lib/calendar-link";
import { outreachKindLabel } from "@/lib/outreach-labels";
import type { OutreachKind, OutreachStatus } from "@/generated/prisma";

export async function saveOutreach(id: string | null, formData: FormData) {
  const session = await requireArea("outreach", true);
  const title = text(formData, "title");
  const startsAt = dateTime(formData, "date", "startTime");
  if (!title || !startsAt) throw new Error("An outreach needs a title and a date.");

  const kind = (text(formData, "kind") ?? "STREET_EVANGELISM") as OutreachKind;
  const data = {
    title,
    kind,
    status: (text(formData, "status") ?? "PLANNED") as OutreachStatus,
    startsAt,
    endsAt: dateTime(formData, "date", "endTime"),
    location: text(formData, "location"),
    area: text(formData, "area"),
    leader: text(formData, "leader"),
    team: text(formData, "team"),
    teamSize: int(formData, "teamSize"),
    plan: text(formData, "plan"),
    materials: text(formData, "materials"),
    estimatedCost: money(formData, "estimatedCost"),
    peopleReached: int(formData, "peopleReached"),
    decisions: int(formData, "decisions"),
    followUpsDue: int(formData, "followUpsDue"),
    report: text(formData, "report"),
  };

  const existing = id ? await db.outreach.findUnique({ where: { id } }) : null;
  const eventId = await syncLinkedEvent(existing?.eventId, {
    title: `${outreachKindLabel(kind)}: ${title}`,
    category: "OUTREACH",
    startsAt,
    endsAt: data.endsAt,
    location: [data.location, data.area].filter(Boolean).join(", ") || null,
    leader: data.leader,
    description: data.plan,
  });

  const saved = id
    ? await db.outreach.update({ where: { id }, data: { ...data, eventId } })
    : await db.outreach.create({ data: { ...data, eventId } });

  await db.auditLog.create({
    data: {
      userId: session.id,
      action: id ? "UPDATE" : "CREATE",
      entity: "Outreach",
      entityId: saved.id,
      summary: `${id ? "Updated" : "Planned"} outreach: ${title}`,
    },
  });

  revalidatePath("/outreach");
  revalidatePath("/planner");
  redirect("/outreach");
}

export async function deleteOutreach(id: string) {
  await requireArea("outreach", true);
  const o = await db.outreach.update({ where: { id }, data: { deletedAt: new Date() } });
  await removeLinkedEvent(o.eventId);
  revalidatePath("/outreach");
  revalidatePath("/planner");
  redirect("/outreach");
}
