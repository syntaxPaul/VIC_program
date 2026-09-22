import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readPhoto, safeName, CONTENT_TYPES } from "@/lib/uploads";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const session = await getSession();
  if (!session) return new NextResponse("Not found", { status: 404 });

  const { name } = await params;
  const safe = safeName(name);
  if (!safe) return new NextResponse("Not found", { status: 404 });

  const data = await readPhoto(safe);
  if (!data) return new NextResponse("Not found", { status: 404 });

  const ext = safe.split(".").pop()!;
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": "private, max-age=86400",
      "Content-Disposition": "inline",
    },
  });
}
