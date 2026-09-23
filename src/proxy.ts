import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import type { Role } from "@/generated/prisma";
import { mayOpen } from "@/lib/route-access";

/*
 * The sidebar only shows each office what it may use, but a hidden link is not
 * a locked door: anyone could type /assets into the address bar. This checks
 * every page request against the same permission table before it renders.
 * Server actions carry their own checks as well (see lib/guards.ts).
 */
const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-secret-change-in-production-min-32-chars-long",
);

export async function proxy(request: NextRequest) {
  // Server actions post to the page they were used on and are checked inside
  // the action itself; only page loads are routed here.
  if (request.method !== "GET") return NextResponse.next();

  const token = request.cookies.get("vic_session")?.value;
  if (!token) return NextResponse.next(); // the app layout sends them to /login

  let role: Role | null = null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    role = payload.role as Role;
  } catch {
    return NextResponse.next();
  }

  if (role && !mayOpen(role, request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|api/|login|apply|icon|favicon|.*\\.[a-zA-Z0-9]+$).*)"],
};
