"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { NoteCategory, Role } from "@/generated/prisma";

/** Pastors keep the notebook; administrators can read it for continuity. */
const CAN_READ: Role[] = ["PASTOR", "ADMIN"];
const CAN_WRITE: Role[] = ["PASTOR", "ADMIN"];

export async function requireNotesAccess(write = false) {
  const session = await getSession();
  if (!session) redirect("/login");
  const allowed = write ? CAN_WRITE : CAN_READ;
  if (!allowed.includes(session.role)) redirect("/");
  return session;
}

function str(fd: FormData, k: string) {
  const v = fd.get(k);
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

export async function saveNote(id: string | null, formData: FormData) {
  const session = await requireNotesAccess(true);

  const title = str(formData, "title");
  const body = str(formData, "body");
  if (!title) throw new Error("A title is required.");
  if (!body) throw new Error("A note needs some content.");

  const dateStr = str(formData, "noteDate");
  const noteDate = dateStr ? new Date(dateStr) : new Date();

  const data = {
    title,
    body,
    category: (str(formData, "category") ?? "GENERAL") as NoteCategory,
    noteDate: Number.isNaN(noteDate.getTime()) ? new Date() : noteDate,
    confidential: formData.get("confidential") === "on",
    pinned: formData.get("pinned") === "on",
    tags: str(formData, "tags"),
  };

  let noteId = id;
  if (id) {
    const existing = await db.pastoralNote.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new Error("That note no longer exists.");
    await db.pastoralNote.update({ where: { id }, data });
  } else {
    const created = await db.pastoralNote.create({ data: { ...data, authorId: session.id } });
    noteId = created.id;
  }

  await db.auditLog.create({
    data: {
      userId: session.id,
      action: id ? "UPDATE" : "CREATE",
      entity: "PastoralNote",
      entityId: noteId!,
      // A confidential note's title is deliberately kept out of the audit
      // trail: the trail records that a note was written, not what it was about.
      summary: data.confidential
        ? `${id ? "Edited" : "Wrote"} a confidential note`
        : `${id ? "Edited" : "Wrote"} "${title}"`,
    },
  });

  revalidatePath("/notes");
  revalidatePath(`/notes/${noteId}`);
  // Land on the note itself rather than the list: you see what you actually
  // saved, and "All notes" is one click away if that is where you wanted to be.
  redirect(`/notes/${noteId}`);
}

/** Soft delete, in keeping with the rest of the system. */
export async function archiveNote(id: string) {
  const session = await requireNotesAccess(true);
  const note = await db.pastoralNote.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await db.auditLog.create({
    data: {
      userId: session.id,
      action: "DELETE",
      entity: "PastoralNote",
      entityId: id,
      summary: note.confidential
        ? "Deleted a confidential note"
        : `Deleted "${note.title}"`,
    },
  });
  revalidatePath("/notes");
  redirect("/notes");
}

export async function togglePin(id: string) {
  await requireNotesAccess(true);
  const n = await db.pastoralNote.findFirst({ where: { id, deletedAt: null } });
  if (!n) return;
  await db.pastoralNote.update({ where: { id }, data: { pinned: !n.pinned } });
  revalidatePath("/notes");
  revalidatePath(`/notes/${id}`);
}
