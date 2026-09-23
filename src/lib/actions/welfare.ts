"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireArea } from "@/lib/guards";
import { dateTime, int, money, syncLinkedEvent, text } from "@/lib/calendar-link";
import type { WelfareKind, WelfareStatus } from "@/generated/prisma";

export async function saveWelfareGrant(id: string | null, formData: FormData) {
  const session = await requireArea("welfare", true);

  const date = dateTime(formData, "date");
  const items = text(formData, "items");
  const memberId = text(formData, "memberId");
  const recipientName = text(formData, "recipientName");
  if (!date || !items) throw new Error("Say what is being given and on what date.");
  if (!memberId && !recipientName) throw new Error("Choose a member, or give the person's name.");

  const data = {
    kind: (text(formData, "kind") ?? "FOOD_PARCEL") as WelfareKind,
    status: (text(formData, "status") ?? "PLANNED") as WelfareStatus,
    date,
    memberId,
    isMember: Boolean(memberId),
    recipientName: memberId ? null : recipientName,
    recipientPhone: text(formData, "recipientPhone"),
    household: text(formData, "household"),
    items,
    quantity: int(formData, "quantity"),
    estimatedValue: money(formData, "estimatedValue"),
    authorisedBy: text(formData, "authorisedBy"),
    eventId: text(formData, "eventId"),
    confidential: formData.get("confidential") === "on",
    notes: text(formData, "notes"),
  };

  const saved = id
    ? await db.welfareGrant.update({ where: { id }, data })
    : await db.welfareGrant.create({ data: { ...data, recordedById: session.id } });

  await db.auditLog.create({
    data: {
      userId: session.id,
      action: id ? "UPDATE" : "CREATE",
      entity: "WelfareGrant",
      entityId: saved.id,
      // The audit trail records that help was given, not to whom.
      summary: `${id ? "Updated" : "Recorded"} welfare: ${data.kind.toLowerCase().replace(/_/g, " ")}`,
    },
  });

  revalidatePath("/welfare");
  if (data.eventId) revalidatePath(`/welfare/days/${data.eventId}`);
  redirect(data.eventId ? `/welfare/days/${data.eventId}` : "/welfare");
}

export async function setWelfareStatus(id: string, status: WelfareStatus) {
  await requireArea("welfare", true);
  const g = await db.welfareGrant.update({ where: { id }, data: { status } });
  revalidatePath("/welfare");
  if (g.eventId) revalidatePath(`/welfare/days/${g.eventId}`);
}

export async function deleteWelfareGrant(id: string) {
  await requireArea("welfare", true);
  await db.welfareGrant.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/welfare");
  redirect("/welfare");
}

/** A day the church hands out food, clothes or blankets — on the calendar. */
export async function saveDistributionDay(formData: FormData) {
  const session = await requireArea("welfare", true);
  const title = text(formData, "title");
  const startsAt = dateTime(formData, "date", "startTime");
  if (!title || !startsAt) throw new Error("A distribution day needs a title and a date.");

  const description = [
    text(formData, "whatIsGiven") && `Giving: ${text(formData, "whatIsGiven")}`,
    text(formData, "households") && `Households expected: ${text(formData, "households")}`,
    text(formData, "volunteers") && `Volunteers: ${text(formData, "volunteers")}`,
    text(formData, "notes"),
  ].filter(Boolean).join("\n");

  const eventId = await syncLinkedEvent(null, {
    title,
    category: "WELFARE",
    startsAt,
    endsAt: dateTime(formData, "date", "endTime"),
    location: text(formData, "location"),
    leader: text(formData, "leader"),
    description: description || null,
  });

  await db.auditLog.create({
    data: { userId: session.id, action: "CREATE", entity: "Event", entityId: eventId, summary: `Organised welfare day: ${title}` },
  });

  revalidatePath("/welfare");
  revalidatePath("/planner");
  redirect(`/welfare/days/${eventId}`);
}

/** Everything planned for a distribution day, marked as handed out. */
export async function markDayGiven(eventId: string) {
  await requireArea("welfare", true);
  await db.welfareGrant.updateMany({
    where: { eventId, status: "PLANNED", deletedAt: null },
    data: { status: "GIVEN" },
  });
  revalidatePath(`/welfare/days/${eventId}`);
  revalidatePath("/welfare");
}
