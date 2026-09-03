import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json([], { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const [members, assets] = await Promise.all([
    db.member.findMany({
      where: {
        deletedAt: null,
        OR: [
          { fullName: { contains: q } },
          { surname: { contains: q } },
          { memberNumber: { contains: q } },
          { email: { contains: q } },
        ],
      },
      select: { id: true, fullName: true, memberNumber: true },
      take: 5,
    }),
    db.asset.findMany({
      where: {
        deletedAt: null,
        OR: [{ description: { contains: q } }, { assetCode: { contains: q } }],
      },
      select: { id: true, description: true, assetCode: true },
      take: 4,
    }),
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
  ]);
}
