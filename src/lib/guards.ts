import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/roles";

/** Anyone allowed to look at membership forms. */
export async function requireApplicationRead() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session.role, "applications")) redirect("/");
  return session;
}

/** Only the offices that may actually act on one. */
export async function requireApplicationWrite() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session.role, "applications", true)) redirect("/");
  return session;
}

/** Signed in and allowed into `area`; with `write`, allowed to change it. */
export async function requireArea(area: string, write = false) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session.role, area, write)) redirect("/");
  return session;
}
