"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireArea } from "@/lib/guards";
import { dateTime, int, removeLinkedEvent, syncLinkedEvent, text } from "@/lib/calendar-link";
import { enumLabel } from "@/lib/format";
import type { YouthDivision, YouthMeetingKind } from "@/generated/prisma";

export async function saveYouthMeeting(id: string | null, formData: FormData) {
  const session = await requireArea("youth", true);

  const title = text(formData, "title");
  const startsAt = dateTime(formData, "date", "startTime");
  const division = text(formData, "division") as YouthDivision | null;
  if (!title || !startsAt || !division) throw new Error("A meeting needs a title, a division and a date.");

  const data = {
    title,
    division,
    kind: (text(formData, "kind") ?? "FELLOWSHIP") as YouthMeetingKind,
    startsAt,
    endsAt: dateTime(formData, "date", "endTime"),
    location: text(formData, "location"),
    leader: text(formData, "leader"),
    scripture: text(formData, "scripture"),
    theme: text(formData, "theme"),
    outline: text(formData, "outline"),
    questions: text(formData, "questions"),
    attended: int(formData, "attended"),
    notes: text(formData, "notes"),
  };

  const existing = id ? await db.youthMeeting.findUnique({ where: { id } }) : null;
  const eventId = await syncLinkedEvent(existing?.eventId, {
    title: `${enumLabel(division)}: ${title}`,
    category: division === "MEN" ? "MEN" : "YOUTH",
    startsAt,
    endsAt: data.endsAt,
    location: data.location,
    leader: data.leader,
    description: data.scripture ? `${data.scripture}${data.theme ? ` — ${data.theme}` : ""}` : null,
  });

  const saved = id
    ? await db.youthMeeting.update({ where: { id }, data: { ...data, eventId } })
    : await db.youthMeeting.create({ data: { ...data, eventId } });

  await db.auditLog.create({
    data: {
      userId: session.id,
      action: id ? "UPDATE" : "CREATE",
      entity: "YouthMeeting",
      entityId: saved.id,
      summary: `${id ? "Updated" : "Planned"} ${enumLabel(division)} — ${title}`,
    },
  });

  revalidatePath("/youth");
  revalidatePath("/planner");
  redirect(`/youth?division=${division}`);
}

export async function deleteYouthMeeting(id: string) {
  await requireArea("youth", true);
  const m = await db.youthMeeting.update({ where: { id }, data: { deletedAt: new Date() } });
  await removeLinkedEvent(m.eventId);
  revalidatePath("/youth");
  revalidatePath("/planner");
  redirect("/youth");
}
