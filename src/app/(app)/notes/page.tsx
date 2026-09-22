import Link from "next/link";
import { NotebookPen, Pin, Plus, Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireNotesAccess, togglePin } from "@/lib/actions/notes";
import { formatDate, enumLabel } from "@/lib/format";
import {
  Badge, Button, Card, EmptyState, Input, PageHeader, Select,
} from "@/components/ui";
import { ConfidentialBody } from "@/components/confidential-body";
import type { NoteCategory, Prisma } from "@/generated/prisma";

const CATEGORIES: NoteCategory[] = [
  "GENERAL", "SERMON", "MEETING", "VISIT", "PRAYER", "FOLLOW_UP",
];

const TONE: Record<string, "neutral" | "brand" | "info" | "warning" | "success"> = {
  GENERAL: "neutral", SERMON: "brand", MEETING: "info",
  VISIT: "success", PRAYER: "warning", FOLLOW_UP: "warning",
};

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  await requireNotesAccess();
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";

  const where: Prisma.PastoralNoteWhereInput = {
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { body: { contains: q, mode: "insensitive" } },
            { tags: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(sp.category ? { category: sp.category as NoteCategory } : {}),
  };

  const notes = await db.pastoralNote.findMany({
    where,
    include: { author: { select: { name: true } } },
    orderBy: [{ pinned: "desc" }, { noteDate: "desc" }],
    take: 100,
  });

  const filtered = Boolean(q || sp.category);

  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeader
        title="Notebook"
        description="Sermon notes, meeting notes and reminders. Kept by the pastors; the administrator can read them for continuity."
        actions={
          <Link href="/notes/new">
            <Button variant="primary"><Plus size={15} /> New note</Button>
          </Link>
        }
      />

      <Card className="mb-4">
        <form className="flex flex-wrap items-end gap-3 p-3">
          <div className="relative min-w-52 flex-1">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input name="q" defaultValue={q} placeholder="Search titles, text and tags…" className="pl-9" />
          </div>
          <Select name="category" defaultValue={sp.category ?? ""} className="w-44">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{enumLabel(c)}</option>
            ))}
          </Select>
          <Button type="submit">Search</Button>
          {filtered ? (
            <Link href="/notes"><Button type="button" variant="ghost">Clear</Button></Link>
          ) : null}
        </form>
      </Card>

      {notes.length === 0 ? (
        <Card>
          <EmptyState
            icon={<NotebookPen size={18} />}
            title={filtered ? "Nothing matches that" : "The notebook is empty"}
            description={
              filtered
                ? "Try a different word, or clear the search."
                : "Write the first note — a sermon idea, something from a meeting, anything worth not forgetting."
            }
            action={
              filtered ? (
                <Link href="/notes"><Button>Clear search</Button></Link>
              ) : (
                <Link href="/notes/new">
                  <Button variant="primary"><Plus size={15} /> New note</Button>
                </Link>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <Card key={n.id} className="overflow-hidden">
              <div className="flex items-start justify-between gap-3 px-5 pt-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/notes/${n.id}`}
                      className="text-[15px] font-semibold hover:underline"
                    >
                      {n.title}
                    </Link>
                    <Badge tone={TONE[n.category] ?? "neutral"}>{enumLabel(n.category)}</Badge>
                    {n.confidential ? <Badge tone="danger">Confidential</Badge> : null}
                    {n.pinned ? <Badge tone="brand"><Pin size={10} /> Pinned</Badge> : null}
                  </div>
                  <p className="mt-1 text-[12.5px] text-[var(--text-muted)]">
                    {formatDate(n.noteDate)} · {n.author.name}
                    {n.tags ? ` · ${n.tags}` : ""}
                  </p>
                </div>
                <form action={togglePin.bind(null, n.id)}>
                  <button
                    type="submit"
                    title={n.pinned ? "Unpin" : "Pin to the top"}
                    className={`rounded-lg p-1.5 transition-colors ${
                      n.pinned
                        ? "text-bronze-600 dark:text-bronze-300"
                        : "text-[var(--text-muted)] hover:bg-sand-100 dark:hover:bg-sand-800"
                    }`}
                  >
                    <Pin size={15} />
                  </button>
                </form>
              </div>

              <div className="px-5 pt-3 pb-4">
                {n.confidential ? (
                  <ConfidentialBody>{n.body}</ConfidentialBody>
                ) : (
                  <p className="line-clamp-4 text-[13.5px] leading-relaxed whitespace-pre-wrap">
                    {n.body}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
