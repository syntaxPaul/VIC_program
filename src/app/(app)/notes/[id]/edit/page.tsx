import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireNotesAccess, saveNote } from "@/lib/actions/notes";
import { NoteForm } from "@/components/note-form";
import { PageHeader } from "@/components/ui";

export default async function EditNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireNotesAccess(true);
  const { id } = await params;
  const note = await db.pastoralNote.findFirst({ where: { id, deletedAt: null } });
  if (!note) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Edit note" />
      <NoteForm action={saveNote.bind(null, id)} values={note} />
    </div>
  );
}
