import { NextResponse } from "next/server";
import { can, getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json([], { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  // Postgres `contains` is case sensitive — without this, searching "dube"
  // would not find "Dube". (It was case insensitive under the old SQLite
  // database, so this only became wrong at the migration.)
  const like = (value: string) => ({ contains: value, mode: "insensitive" as const });

  const canReadNotes = can(session.role, "notes");

  const [members, assets, notes] = await Promise.all([
    db.member.findMany({
      where: {
        deletedAt: null,
        OR: [
          { fullName: like(q) },
          { surname: like(q) },
          { memberNumber: like(q) },
          { email: like(q) },
        ],
      },
      select: { id: true, fullName: true, memberNumber: true },
      take: 5,
    }),
    db.asset.findMany({
      where: {
        deletedAt: null,
        OR: [{ description: like(q) }, { assetCode: like(q) }],
      },
      select: { id: true, description: true, assetCode: true },
      take: 4,
    }),
    canReadNotes
      ? db.pastoralNote.findMany({
          where: {
            deletedAt: null,
            // Confidential notes stay out of the quick search entirely. Even a
            // title can give away a counselling matter to whoever is looking
            // over the shoulder, and the notebook itself is only a click away.
            confidential: false,
            OR: [{ title: like(q) }, { body: like(q) }, { tags: like(q) }],
          },
          select: { id: true, title: true },
          take: 4,
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json([
    ...members.map((m) => ({
      label: m.fullName,
      href: `/members/${m.id}`,
      hint: m.memberNumber,
      icon: "User",
    })),
    ...assets.map((a) => ({
      label: a.description,
      href: `/assets/${a.id}`,
      hint: a.assetCode,
      icon: "Package",
    })),
    ...notes.map((n) => ({
      label: n.title,
      href: `/notes/${n.id}`,
      hint: "Notebook",
      icon: "NotebookPen",
    })),
  ]);
}
