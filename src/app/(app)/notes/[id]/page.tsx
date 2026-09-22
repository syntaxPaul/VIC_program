import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, Pencil, Pin, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { archiveNote, requireNotesAccess, togglePin } from "@/lib/actions/notes";
import { formatDateLong, enumLabel } from "@/lib/format";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { ConfidentialBody } from "@/components/confidential-body";

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireNotesAccess();
  const { id } = await params;

  const note = await db.pastoralNote.findFirst({
    where: { id, deletedAt: null },
    include: { author: { select: { name: true } } },
  });
  if (!note) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={note.title}
        description={`${formatDateLong(note.noteDate)} · ${note.author.name}`}
        actions={
          <>
            <form action={togglePin.bind(null, note.id)}>
              <Button type="submit">
                <Pin size={15} /> {note.pinned ? "Unpin" : "Pin"}
              </Button>
            </form>
            <Link href={`/notes/${note.id}/edit`}>
              <Button variant="primary"><Pencil size={15} /> Edit</Button>
            </Link>
          </>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3">
          <Badge tone="brand">{enumLabel(note.category)}</Badge>
          {note.confidential ? (
            <Badge tone="danger"><Lock size={10} /> Confidential</Badge>
          ) : null}
          {note.tags
            ? note.tags.split(",").map((t) => (
                <Badge key={t}>{t.trim()}</Badge>
              ))
            : null}
        </div>

        <div className="p-5">
          {note.confidential ? (
            <ConfidentialBody>{note.body}</ConfidentialBody>
          ) : (
            <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{note.body}</p>
          )}
        </div>

        <div className="flex items-center justify-between border-t px-5 py-3">
          <Link href="/notes" className="text-[13px] text-bronze-600 hover:underline dark:text-bronze-300">
            ← All notes
          </Link>
          <form action={archiveNote.bind(null, note.id)}>
            <Button type="submit" variant="ghost" className="text-danger">
              <Trash2 size={14} /> Delete
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
