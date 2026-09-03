import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { UPLOAD_DIR, CONTENT_TYPES } from "@/lib/uploads";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const session = await getSession();
  if (!session) return new NextResponse("Not found", { status: 404 });

  const { name } = await params;

  // basename strips any traversal attempt before it reaches the filesystem
  const safe = path.basename(name);
  if (!/^[\w-]+\.(jpg|png|webp|gif)$/.test(safe)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const data = await readFile(path.join(/* turbopackIgnore: true */ UPLOAD_DIR, safe));
    const ext = safe.split(".").pop()!;
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=86400",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
