import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { usingBlobStorage } from "@/lib/uploads";

/** Dependency check for humans. Admin only, and never used as a probe. */
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (session?.role !== "ADMIN") {
    return new NextResponse("Not found", { status: 404 });
  }

  const checks: Record<string, unknown> = {
    photoStorage: usingBlobStorage ? "azure-blob" : "local-filesystem",
    revision: process.env.CONTAINER_APP_REVISION ?? "local",
    node: process.version,
  };

  const started = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = { ok: true, latencyMs: Date.now() - started };
  } catch (e) {
    checks.database = { ok: false, error: (e as Error).message };
  }

  const ok = (checks.database as { ok: boolean }).ok;
  return NextResponse.json(checks, { status: ok ? 200 : 503 });
}
