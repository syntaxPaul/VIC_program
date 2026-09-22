/**
 * Liveness and readiness probe.
 *
 * Deliberately touches nothing. If this checked the database, a brief
 * Postgres hiccup would fail the probe, kill the replica, restart the app
 * and reconnect to the same struggling database — turning a blip into an
 * outage. Dependency checks live at /api/diagnostics, which is not probed.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok", at: new Date().toISOString() });
}
