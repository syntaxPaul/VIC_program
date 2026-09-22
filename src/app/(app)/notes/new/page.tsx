import { requireNotesAccess, saveNote } from "@/lib/actions/notes";
import { NoteForm } from "@/components/note-form";
import { PageHeader } from "@/components/ui";

export default async function NewNotePage() {
  await requireNotesAccess(true);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New note" />
      <NoteForm action={saveNote.bind(null, null)} />
    </div>
  );
}
