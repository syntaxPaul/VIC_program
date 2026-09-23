"use server";

import { requireArea } from "@/lib/guards";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { BaptismStatus, EventCategory } from "@/generated/prisma";

function str(fd: FormData, k: string) {
  const v = fd.get(k);
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}
function dt(fd: FormData, k: string) {
  const s = str(fd, k);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function saveEvent(id: string | null, formData: FormData) {
  await requireArea("planner", true);

  const startsAt = dt(formData, "startsAt");
  if (!startsAt) throw new Error("A start date and time is required.");

  const data = {
    title: str(formData, "title") ?? "Untitled",
    category: (str(formData, "category") ?? "OTHER") as EventCategory,
    startsAt,
    endsAt: dt(formData, "endsAt"),
    allDay: formData.get("allDay") === "on",
    location: str(formData, "location"),
    leader: str(formData, "leader"),
    description: str(formData, "description"),
  };

  if (id) await db.event.update({ where: { id }, data });
  else await db.event.create({ data });

  revalidatePath("/planner");
  redirect("/planner");
}

export async function deleteEvent(id: string) {
  await requireArea("planner", true);
  await db.event.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/planner");
}

/* ── baptisms ────────────────────────────────────────────────────── */

async function nextRegisterNumber(year: number) {
  const count = await db.baptism.count({
    where: { programmeYear: year, registerNumber: { not: null } },
  });
  return `BAP-${year}-${String(count + 1).padStart(3, "0")}`;
}

export async function saveBaptism(id: string | null, formData: FormData) {
  await requireArea("sacraments", true);

  const status = (str(formData, "status") ?? "CANDIDATE") as BaptismStatus;
  const baptismDate = dt(formData, "baptismDate");
  const programmeYear =
    parseInt(str(formData, "programmeYear") ?? "", 10) || new Date().getFullYear();

  const data = {
    memberId: str(formData, "memberId"),
    fullName: str(formData, "fullName") ?? "",
    dob: dt(formData, "dob"),
    placeOfBirth: str(formData, "placeOfBirth"),
    parentNames: str(formData, "parentNames"),
    programmeYear,
    status,
    classStartDate: dt(formData, "classStartDate"),
    baptismDate,
    placeOfBaptism: str(formData, "placeOfBaptism"),
    mode: str(formData, "mode"),
    officiant: str(formData, "officiant"),
    witness1: str(formData, "witness1"),
    witness2: str(formData, "witness2"),
    scriptureVerse: str(formData, "scriptureVerse"),
    notes: str(formData, "notes"),
  };

  if (!data.fullName) throw new Error("A full name is required.");

  let baptismId = id;

  if (id) {
    const existing = await db.baptism.findUniqueOrThrow({ where: { id } });
    await db.baptism.update({
      where: { id },
      data: {
        ...data,
        // a register number is assigned the moment the baptism happens
        registerNumber:
          existing.registerNumber ??
          (status === "BAPTISED" ? await nextRegisterNumber(programmeYear) : null),
      },
    });
  } else {
    const created = await db.baptism.create({
      data: {
        ...data,
        registerNumber: status === "BAPTISED" ? await nextRegisterNumber(programmeYear) : null,
      },
    });
    baptismId = created.id;
  }

  // keep the member's own baptism date in step with the register
  if (data.memberId && baptismDate && status === "BAPTISED") {
    await db.member.update({
      where: { id: data.memberId },
      data: { baptismDate },
    });
  }

  revalidatePath("/baptisms");
  redirect(`/baptisms/${baptismId}`);
}

export async function issueCertificate(id: string) {
  const session = await requireArea("sacraments", true);

  const b = await db.baptism.findUniqueOrThrow({ where: { id } });
  if (b.status !== "BAPTISED") {
    throw new Error("A certificate can only be issued once the baptism has taken place.");
  }

  await db.baptism.update({
    where: { id },
    data: {
      certificateIssuedAt: new Date(),
      certificateIssuedBy: session.name,
      // a reissue is marked so a replacement is distinguishable from the original
      certificateReissueCount: b.certificateIssuedAt ? b.certificateReissueCount + 1 : 0,
      registerNumber: b.registerNumber ?? (await nextRegisterNumber(b.programmeYear)),
    },
  });

  revalidatePath(`/baptisms/${id}`);
  redirect(`/baptisms/${id}/certificate`);
}
