"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { formatDateInput } from "@/lib/format";
import { parseSaId } from "@/lib/sa-id";
import type { Gender, MaritalStatus, Member } from "@/generated/prisma";

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

/** Digits only, so 082 123 4567 and 0821234567 are the same number. */
function normalisePhone(p: string | null) {
  if (!p) return null;
  const digits = p.replace(/\D/g, "");
  return digits.length >= 9 ? digits.slice(-9) : digits || null;
}

function normaliseName(n: string | null) {
  return n ? n.trim().toLowerCase().replace(/\s+/g, " ") : null;
}

/**
 * A coarse fingerprint of the submitter, for rate limiting only.
 *
 * The address is salted with the app secret and truncated, so the table the
 * public writes to never holds anything that identifies a device on its own.
 */
async function sourceFingerprint() {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown";
  const salt = process.env.AUTH_SECRET ?? "vic";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export type ApplyResult = { ok: true } | { ok: false; error: string };

/**
 * Look for somebody already on the register who this is likely to be.
 *
 * A shared telephone number is deliberately NOT enough on its own: a
 * household here often has one phone between them, and treating that as a
 * duplicate would reject a whole family after the first person joined.
 */
async function findLikelyDuplicate(input: {
  fullName: string;
  surname: string;
  dob: Date | null;
  phone: string | null;
  email: string | null;
  idNumber?: string | null;
}): Promise<{ member: Member; reason: string } | null> {
  // An identity number belongs to exactly one person, so it settles the
  // question before any fuzzier comparison is needed.
  if (input.idNumber) {
    const byId = await db.member.findFirst({ where: { deletedAt: null, idNumber: input.idNumber } });
    if (byId) return { member: byId, reason: "Same ID number" };
  }

  const name = normaliseName(input.fullName);
  const phone = normalisePhone(input.phone);
  const email = input.email?.toLowerCase() ?? null;

  const candidates = await db.member.findMany({
    where: {
      deletedAt: null,
      OR: [
        { surname: { equals: input.surname, mode: "insensitive" } },
        ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : []),
      ],
    },
    take: 200,
  });

  for (const m of candidates) {
    if (email && m.email && m.email.toLowerCase() === email) {
      return { member: m, reason: "Same email address" };
    }
  }

  for (const m of candidates) {
    const sameName = normaliseName(m.fullName) === name;
    if (!sameName) continue;

    if (input.dob && m.dob && formatDateInput(m.dob) === formatDateInput(input.dob)) {
      return { member: m, reason: "Same name and date of birth" };
    }
    if (phone && normalisePhone(m.phone) === phone) {
      return { member: m, reason: "Same name and telephone number" };
    }
    return { member: m, reason: "Same name" };
  }

  return null;
}

/** Submitted from the public link. Nothing here is trusted. */
export async function submitApplication(formData: FormData): Promise<ApplyResult> {
  const settings = await db.settings.findFirst();
  if (settings && !settings.publicFormOpen) {
    return { ok: false, error: "The membership form is closed at the moment. Please speak to the church office." };
  }

  // Bots fill in every field they can find; a person never sees this one.
  if (str(formData, "website")) return { ok: true };

  // ... and they submit instantly. A real form takes longer than five seconds.
  const openedAt = Number(formData.get("openedAt") ?? 0);
  if (!openedAt || Date.now() - openedAt < 5000) {
    return { ok: false, error: "Please take a moment to check the form, then submit again." };
  }

  const surname = str(formData, "surname");
  const fullName = str(formData, "fullName");
  if (!surname || !fullName) {
    return { ok: false, error: "Please give your surname and your full name." };
  }
  if (fullName.length > 120 || surname.length > 120) {
    return { ok: false, error: "That name is longer than the form allows." };
  }

  const sourceHash = await sourceFingerprint();
  const recent = await db.membershipApplication.count({
    where: { sourceHash, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recent >= 3) {
    return { ok: false, error: "Several forms have already been sent from this device. Please contact the church office." };
  }

  // The ID number, when given and valid, fills in anything left blank.
  const idRaw = str(formData, "idNumber")?.replace(/\D/g, "") ?? null;
  const id = idRaw ? parseSaId(idRaw) : null;
  const idNumber = id?.valid ? idRaw : idRaw || null;

  const data = {
    surname,
    fullName,
    idNumber,
    dob: date(formData, "dob") ?? (id?.valid ? id.dob : null),
    gender: (str(formData, "gender") as Gender | null) ?? (id?.valid ? id.gender : null),
    maritalStatus: (str(formData, "maritalStatus") as MaritalStatus | null) ?? null,
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
    interestedIn: formData.getAll("interestedIn").map(String).filter(Boolean).join(", ") || null,
  };

  const dup = await findLikelyDuplicate({
    fullName, surname, dob: data.dob, phone: data.phone, email: data.email, idNumber: data.idNumber,
  });

  await db.membershipApplication.create({
    data: {
      ...data,
      sourceHash,
      status: dup ? "HELD_DUPLICATE" : "PENDING",
      possibleDuplicateOfId: dup?.member.id ?? null,
      duplicateReason: dup?.reason ?? null,
    },
  });

  // The person filling the form is never told whether the church already has
  // them: that would turn a public form into a way of testing who is a member.
  return { ok: true };
}

// ── the office side ──────────────────────────────────────────────────

async function requireApplicationAccess(write = false) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session.role, "applications", write)) redirect("/");
  return session;
}

async function nextMemberNumber() {
  const last = await db.member.findFirst({
    orderBy: { memberNumber: "desc" },
    select: { memberNumber: true },
  });
  const n = last ? parseInt(last.memberNumber.replace(/\D/g, ""), 10) + 1 : 1;
  return `VIC-${String(n).padStart(4, "0")}`;
}

function memberFields(a: Awaited<ReturnType<typeof db.membershipApplication.findFirst>>) {
  if (!a) throw new Error("That application no longer exists.");
  return {
    surname: a.surname,
    fullName: a.fullName,
    idNumber: a.idNumber,
    dob: a.dob,
    gender: a.gender,
    maritalStatus: a.maritalStatus,
    addressLine: a.addressLine,
    city: a.city,
    province: a.province,
    postalCode: a.postalCode,
    phone: a.phone,
    email: a.email,
    children: a.children,
    salvationDate: a.salvationDate,
    baptismDate: a.baptismDate,
    previousChurch: a.previousChurch,
    previousChurchLocation: a.previousChurchLocation,
    prayerRequests: a.prayerRequests,
  };
}

/** Accept the submission as a new person on the register. */
export async function acceptApplication(id: string, formData: FormData) {
  const session = await requireApplicationAccess(true);
  const a = await db.membershipApplication.findFirst({ where: { id } });
  if (!a) throw new Error("That application no longer exists.");

  const member = await db.member.create({
    data: {
      ...memberFields(a),
      memberNumber: await nextMemberNumber(),
      notes: a.interestedIn ? `Interested in: ${a.interestedIn}` : null,
    },
  });

  await db.membershipApplication.update({
    where: { id },
    data: {
      status: "ACCEPTED",
      reviewedAt: new Date(),
      reviewedBy: session.name,
      reviewNote: (formData.get("reviewNote") as string) || null,
      createdMemberId: member.id,
    },
  });

  await db.auditLog.create({
    data: {
      userId: session.id,
      action: "CREATE",
      entity: "Member",
      entityId: member.id,
      summary: `Accepted ${a.fullName} from the membership form`,
    },
  });

  revalidatePath("/applications");
  revalidatePath("/members");
  redirect(`/members/${member.id}`);
}

/** The submission was the same person: update their record instead. */
export async function mergeApplication(id: string, formData: FormData) {
  const session = await requireApplicationAccess(true);
  const a = await db.membershipApplication.findFirst({ where: { id } });
  if (!a?.possibleDuplicateOfId) throw new Error("There is nobody to merge this into.");

  const fields = memberFields(a);
  // Only fill gaps. Somebody in the office entered what is already there, and
  // a form filled in by the public should not overwrite it.
  const existing = await db.member.findUniqueOrThrow({ where: { id: a.possibleDuplicateOfId } });
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v !== null && v !== undefined && (existing as Record<string, unknown>)[k] == null) {
      patch[k] = v;
    }
  }

  await db.member.update({ where: { id: existing.id }, data: patch });

  await db.membershipApplication.update({
    where: { id },
    data: {
      status: "MERGED",
      reviewedAt: new Date(),
      reviewedBy: session.name,
      reviewNote: (formData.get("reviewNote") as string) || null,
      createdMemberId: existing.id,
    },
  });

  await db.auditLog.create({
    data: {
      userId: session.id,
      action: "UPDATE",
      entity: "Member",
      entityId: existing.id,
      summary: `Merged a membership form into ${existing.fullName} (${Object.keys(patch).length} field${Object.keys(patch).length === 1 ? "" : "s"} filled in)`,
    },
  });

  revalidatePath("/applications");
  revalidatePath(`/members/${existing.id}`);
  redirect(`/members/${existing.id}`);
}

/** Not a duplicate after all — treat it as a new person. */
export async function notADuplicate(id: string) {
  await requireApplicationAccess(true);
  await db.membershipApplication.update({
    where: { id },
    data: { status: "PENDING", possibleDuplicateOfId: null, duplicateReason: null },
  });
  revalidatePath("/applications");
  redirect(`/applications/${id}`);
}

export async function declineApplication(id: string, formData: FormData) {
  const session = await requireApplicationAccess(true);
  await db.membershipApplication.update({
    where: { id },
    data: {
      status: "DECLINED",
      reviewedAt: new Date(),
      reviewedBy: session.name,
      reviewNote: (formData.get("reviewNote") as string) || null,
    },
  });
  revalidatePath("/applications");
  redirect("/applications");
}

/**
 * Clear the "recently handled" list.
 *
 * Marks them cleared rather than deleting: a church has to be able to say who
 * accepted or declined somebody and when, long after the office has tidied
 * its screen.
 */
export async function clearHandledApplications() {
  const session = await requireApplicationAccess(true);
  const { count } = await db.membershipApplication.updateMany({
    where: {
      status: { in: ["ACCEPTED", "MERGED", "DECLINED"] },
      clearedAt: null,
    },
    data: { clearedAt: new Date() },
  });

  if (count > 0) {
    await db.auditLog.create({
      data: {
        userId: session.id,
        action: "UPDATE",
        entity: "MembershipApplication",
        entityId: "list",
        summary: `Cleared ${count} handled membership form${count === 1 ? "" : "s"} from the list`,
      },
    });
  }

  revalidatePath("/applications");
}
