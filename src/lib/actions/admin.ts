"use server";

import { requireArea } from "@/lib/guards";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";
import type { Role } from "@/generated/prisma";

function str(fd: FormData, k: string) {
  const v = fd.get(k);
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}
function bool(fd: FormData, k: string) {
  return fd.get(k) === "on";
}
function num(fd: FormData, k: string) {
  const s = str(fd, k);
  if (!s) return 0;
  const n = parseFloat(s.replace(/[\s ]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") throw new Error("Only an administrator may do this.");
  return session;
}

export async function saveSettings(formData: FormData) {
  await requireAdmin();

  const data = {
    churchName: str(formData, "churchName") ?? "Victory in Christ",
    addressLine1: str(formData, "addressLine1") ?? "",
    city: str(formData, "city") ?? "",
    province: str(formData, "province") ?? "",
    postalCode: str(formData, "postalCode") ?? "",
    phone: str(formData, "phone") ?? "",
    email: str(formData, "email") ?? "",
    isNpoRegistered: bool(formData, "isNpoRegistered"),
    npoNumber: str(formData, "npoNumber") ?? "",
    isPboApproved: bool(formData, "isPboApproved"),
    pboNumber: str(formData, "pboNumber") ?? "",
    is18aApproved: bool(formData, "is18aApproved"),
    section18aNumber: str(formData, "section18aNumber") ?? "",
    financialYearStartMonth: parseInt(str(formData, "financialYearStartMonth") ?? "3", 10) || 3,
    capitalisationThreshold: num(formData, "capitalisationThreshold"),
    titheOutPercent: num(formData, "titheOutPercent"),
    mainMinistryName: str(formData, "mainMinistryName") ?? "",
    publicFormOpen: formData.get("publicFormOpen") === "on",
  };

  await db.settings.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });

  revalidatePath("/settings");
  revalidatePath("/");
  redirect("/settings?saved=1");
}

export async function saveUser(id: string | null, formData: FormData) {
  await requireAdmin();

  const email = (str(formData, "email") ?? "").toLowerCase();
  const name = str(formData, "name") ?? "";
  const role = (str(formData, "role") ?? "SECRETARY") as Role;
  const password = str(formData, "password");
  const isActive = bool(formData, "isActive");

  if (!email || !name) throw new Error("Name and email are required.");

  if (id) {
    await db.user.update({
      where: { id },
      data: {
        email, name, role, isActive,
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
      },
    });
  } else {
    if (!password) throw new Error("A password is required for a new user.");
    await db.user.create({
      data: { email, name, role, isActive, passwordHash: await hashPassword(password) },
    });
  }

  revalidatePath("/users");
  redirect("/users");
}

export async function createMinistry(formData: FormData) {
  await requireArea("members", true);

  const name = str(formData, "name");
  if (!name) throw new Error("A name is required.");

  await db.ministry.create({
    data: { name, description: str(formData, "description") },
  });

  revalidatePath("/ministries");
  redirect("/ministries");
}

/** Tick individual members present on a register. */
export async function saveAttendanceEntries(registerId: string, formData: FormData) {
  await requireArea("members", true);

  const present = new Set(formData.getAll("present").map(String));
  const all = formData.getAll("member").map(String);

  await db.$transaction(
    all.map((memberId) =>
      db.attendanceEntry.upsert({
        where: { registerId_memberId: { registerId, memberId } },
        create: { registerId, memberId, present: present.has(memberId) },
        update: { present: present.has(memberId) },
      }),
    ),
  );

  // keep the headcount in step with the ticked register
  await db.attendanceRegister.update({
    where: { id: registerId },
    data: { headcount: present.size },
  });

  revalidatePath(`/attendance/${registerId}`);
  revalidatePath("/attendance");
  redirect(`/attendance/${registerId}`);
}

export async function recordAttendance(formData: FormData) {
  await requireArea("members", true);

  const s = str(formData, "serviceDate");
  const serviceDate = s ? new Date(s) : new Date();
  const headcount = parseInt(str(formData, "headcount") ?? "", 10);

  const register = await db.attendanceRegister.create({
    data: {
      serviceDate,
      serviceName: str(formData, "serviceName") ?? "Sunday Service",
      headcount: Number.isFinite(headcount) ? headcount : null,
      notes: str(formData, "notes"),
    },
  });

  revalidatePath("/attendance");
  redirect(`/attendance/${register.id}`);
}
