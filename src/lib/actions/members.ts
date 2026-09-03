"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { savePhoto, deletePhoto } from "@/lib/uploads";
import type { Gender, MaritalStatus, MemberStatus } from "@/generated/prisma";

function str(fd: FormData, k: string) {
  const v = fd.get(k);
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

function date(fd: FormData, k: string) {
  const s = str(fd, k);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function nextMemberNumber() {
  const last = await db.member.findFirst({
    orderBy: { memberNumber: "desc" },
    select: { memberNumber: true },
  });
  const n = last ? parseInt(last.memberNumber.replace(/\D/g, ""), 10) + 1 : 1;
  return `VIC-${String(n).padStart(4, "0")}`;
}

export async function saveMember(id: string | null, formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = {
    surname: str(formData, "surname") ?? "",
    fullName: str(formData, "fullName") ?? "",
    dob: date(formData, "dob"),
    gender: (str(formData, "gender") as Gender | null) ?? null,
    maritalStatus: (str(formData, "maritalStatus") as MaritalStatus | null) ?? null,
    status: (str(formData, "status") as MemberStatus | null) ?? "ACTIVE",
    addressLine: str(formData, "addressLine"),
    city: str(formData, "city"),
    province: str(formData, "province"),
    postalCode: str(formData, "postalCode"),
    phone: str(formData, "phone"),
    email: str(formData, "email"),
    children: str(formData, "children"),
    salvationDate: date(formData, "salvationDate"),
    baptismDate: date(formData, "baptismDate"),
    previousChurch: str(formData, "previousChurch"),
    previousChurchLocation: str(formData, "previousChurchLocation"),
    prayerRequests: str(formData, "prayerRequests"),
    notes: str(formData, "notes"),
    idNumber: str(formData, "idNumber"),
    taxRefNumber: str(formData, "taxRefNumber"),
  };

  if (!data.fullName || !data.surname) {
    throw new Error("Surname and full name are required.");
  }

  const photo = formData.get("photo");
  const newPhoto = photo instanceof File ? await savePhoto(photo) : null;

  const ministryIds = formData.getAll("ministries").map(String).filter(Boolean);
  const interestIds = formData.getAll("interests").map(String).filter(Boolean);

  let memberId = id;

  if (id) {
    if (newPhoto) {
      const prev = await db.member.findUnique({
        where: { id },
        select: { photoPath: true },
      });
      await deletePhoto(prev?.photoPath);
    }
    await db.member.update({
      where: { id },
      data: newPhoto ? { ...data, photoPath: newPhoto } : data,
    });
    await db.memberMinistry.deleteMany({ where: { memberId: id } });
    await db.memberInterest.deleteMany({ where: { memberId: id } });
  } else {
    const created = await db.member.create({
      data: {
        ...data,
        photoPath: newPhoto,
        memberNumber: await nextMemberNumber(),
      },
    });
    memberId = created.id;
  }

  for (const mid of ministryIds) {
    await db.memberMinistry.create({ data: { memberId: memberId!, ministryId: mid } });
  }
  for (const iid of interestIds) {
    await db.memberInterest.create({ data: { memberId: memberId!, interestId: iid } });
  }

  await db.auditLog.create({
    data: {
      userId: session.id,
      action: id ? "UPDATE" : "CREATE",
      entity: "Member",
      entityId: memberId!,
      summary: `${id ? "Updated" : "Registered"} ${data.fullName}`,
    },
  });

  revalidatePath("/members");
  redirect(`/members/${memberId}`);
}

/** Soft delete — records are retained for at least five years. */
export async function archiveMember(id: string) {
  const session = await getSession();
  if (!session) redirect("/login");

  const m = await db.member.update({
    where: { id },
    data: { deletedAt: new Date(), status: "INACTIVE" },
  });

  await db.auditLog.create({
    data: {
      userId: session.id,
      action: "DELETE",
      entity: "Member",
      entityId: id,
      summary: `Archived ${m.fullName}`,
    },
  });

  revalidatePath("/members");
  redirect("/members");
}
