"use server";

import { redirect } from "next/navigation";
import { destroySession } from "@/lib/auth";

/**
 * Sign out and go back to the landing page.
 *
 * This was a route handler that redirected to `new URL("/login", request.url)`.
 * Behind the Container Apps ingress the request URL is the container's own
 * internal address, so the browser was being sent to a host that does not
 * exist outside Azure. A server action redirects by path and has no such
 * problem.
 */
export async function signOut() {
  await destroySession();
  redirect("/login");
}
