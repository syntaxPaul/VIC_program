/**
 * Open the database connection while the container is starting, not on
 * somebody's first click.
 *
 * Without this the first request after a deployment pays for the connection
 * handshake and the pool warm-up on top of its own work — a signed-in page
 * that normally answers in under half a second took nearly six. Nobody should
 * meet the slowest version of the app.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { db } = await import("@/lib/db");
    await db.$queryRaw`select 1`;
  } catch {
    // A database that is not ready yet is not a reason to refuse to start:
    // the health check and the pages will report it properly.
  }
}
