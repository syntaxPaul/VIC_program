"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireArea } from "@/lib/guards";
import { dateTime, syncLinkedEvent, text } from "@/lib/calendar-link";
import type { ConsecrationStatus, Gender } from "@/generated/prisma";

async function nextRegisterNumber(year: number) {
  const count = await db.consecration.count({
    where: { registerNumber: { startsWith: `CON-${year}-` } },
  });
  return `CON-${year}-${String(count + 1).padStart(3, "0")}`;
}

export async function saveConsecration(id: string | null, formData: FormData) {
  const session = await requireArea("sacraments", true);
  const childName = text(formData, "childName");
  if (!childName) throw new Error("The child's name is required.");

  const consecrationDate = dateTime(formData, "consecrationDate", "time");
  const status = (text(formData, "status") ?? "REQUESTED") as ConsecrationStatus;
  if (status === "CONSECRATED" && !consecrationDate) {
    throw new Error("A consecration that has taken place needs its date.");
  }

  const data = {
    childName,
    childDob: dateTime(formData, "childDob"),
    childGender: (text(formData, "childGender") as Gender | null) ?? null,
    fatherName: text(formData, "fatherName"),
    motherName: text(formData, "motherName"),
    guardianName: text(formData, "guardianName"),
    parentPhone: text(formData, "parentPhone"),
    status,
    consecrationDate,
    place: text(formData, "place"),
    officiant: text(formData, "officiant"),
    scripture: text(formData, "scripture"),
    witnesses: text(formData, "witnesses"),
    notes: text(formData, "notes"),
  };

  const saved = id
    ? await db.consecration.update({ where: { id }, data })
    : await db.consecration.create({ data });

  // A scheduled consecration is a service moment — put it on the calendar.
  if (consecrationDate && (status === "SCHEDULED" || status === "CONSECRATED")) {
    await syncLinkedEvent(null, {
      title: `Consecration: ${childName}`,
      category: "CONSECRATION",
      startsAt: consecrationDate,
      location: data.place,
      leader: data.officiant,
    }).catch(() => null);
  }

  await db.auditLog.create({
    data: {
      userId: session.id,
      action: id ? "UPDATE" : "CREATE",
      entity: "Consecration",
      entityId: saved.id,
      summary: `${id ? "Updated" : "Recorded"} consecration of ${childName}`,
    },
  });

  revalidatePath("/consecrations");
  redirect(`/consecrations/${saved.id}`);
}

export async function issueConsecrationCertificate(id: string) {
  const session = await requireArea("sacraments", true);
  const c = await db.consecration.findUniqueOrThrow({ where: { id } });
  if (c.status !== "CONSECRATED" || !c.consecrationDate) {
    throw new Error("A certificate can only be issued once the child has been consecrated.");
  }
  await db.consecration.update({
    where: { id },
    data: {
      certificateIssuedAt: new Date(),
      certificateIssuedBy: session.name,
      registerNumber: c.registerNumber ?? (await nextRegisterNumber(c.consecrationDate.getFullYear())),
    },
  });
  revalidatePath(`/consecrations/${id}`);
  redirect(`/consecrations/${id}/certificate`);
}
