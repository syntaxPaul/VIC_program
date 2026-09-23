import type { Role } from "@/generated/prisma";
import { NAV } from "@/components/nav-config";
import { can } from "@/lib/roles";

/*
 * Which area a page belongs to, worked out from the sidebar itself so the two
 * can never disagree. The longest matching prefix wins, which is how
 * /reports/board-pack belongs to the treasury while /reports belongs to
 * reports. The dashboard is everyone's landing page and is not guarded here.
 */
const ROUTES = NAV.flatMap((s) => s.items)
  .filter((i) => i.href !== "/")
  .map((i) => ({ prefix: i.href, area: i.area }))
  .sort((a, b) => b.prefix.length - a.prefix.length);

export function areaFor(pathname: string): string | null {
  for (const r of ROUTES) {
    if (pathname === r.prefix || pathname.startsWith(r.prefix + "/")) return r.area;
  }
  return null;
}

/** Pages that exist to change something need write access, not just read. */
function isWritePage(pathname: string) {
  return /\/(new|edit)(\/|$)/.test(pathname);
}

export function mayOpen(role: Role, pathname: string): boolean {
  const area = areaFor(pathname);
  if (!area) return true;
  return can(role, area, isWritePage(pathname));
}
