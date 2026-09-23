"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireArea } from "@/lib/guards";
import { dateTime, int, removeLinkedEvent, syncLinkedEvent, text } from "@/lib/calendar-link";
import type { ChildAgeGroup, ChildrensActivityKind } from "@/generated/prisma";

export async function saveChildrensActivity(id: string | null, formData: FormData) {
  const session = await requireArea("children", true);

  const title = text(formData, "title");
  const startsAt = dateTime(formData, "date", "startTime");
  if (!title || !startsAt) throw new Error("A children's activity needs a title and a date.");

  const data = {
    title,
    kind: (text(formData, "kind") ?? "SUNDAY_SCHOOL") as ChildrensActivityKind,
    ageGroup: (text(formData, "ageGroup") ?? "ALL_AGES") as ChildAgeGroup,
    startsAt,
    endsAt: dateTime(formData, "date", "endTime"),
    location: text(formData, "location"),
    leader: text(formData, "leader"),
    helpers: text(formData, "helpers"),
    lessonTitle: text(formData, "lessonTitle"),
    scripture: text(formData, "scripture"),
    memoryVerse: text(formData, "memoryVerse"),
    materials: text(formData, "materials"),
    expectedChildren: int(formData, "expectedChildren"),
    attended: int(formData, "attended"),
    parentNotes: text(formData, "parentNotes"),
    notes: text(formData, "notes"),
  };

  const existing = id ? await db.childrensActivity.findUnique({ where: { id } }) : null;
  const eventId = await syncLinkedEvent(existing?.eventId, {
    title: `Children: ${title}`,
    category: "CHILDREN",
    startsAt,
    endsAt: data.endsAt,
    location: data.location,
    leader: data.leader,
    description: data.lessonTitle ? `Lesson: ${data.lessonTitle}` : null,
  });

  const saved = id
    ? await db.childrensActivity.update({ where: { id }, data: { ...data, eventId } })
    : await db.childrensActivity.create({ data: { ...data, eventId } });

  await db.auditLog.create({
    data: {
      userId: session.id,
      action: id ? "UPDATE" : "CREATE",
      entity: "ChildrensActivity",
      entityId: saved.id,
      summary: `${id ? "Updated" : "Planned"} children's ${title}`,
    },
  });

  revalidatePath("/children");
  revalidatePath("/planner");
  redirect("/children");
}

export async function deleteChildrensActivity(id: string) {
  await requireArea("children", true);
  const a = await db.childrensActivity.update({ where: { id }, data: { deletedAt: new Date() } });
  await removeLinkedEvent(a.eventId);
  revalidatePath("/children");
  revalidatePath("/planner");
  redirect("/children");
}
