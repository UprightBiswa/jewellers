import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig, ADMIN_ROLES } from "@/auth.config";
import { preflight, withCors } from "@/lib/api/cors";

const { auth } = NextAuth(authConfig);

/** Routes a signed-out visitor must never reach. */
const CUSTOMER_PROTECTED = ["/account", "/checkout"];

/** The only /admin path a signed-out visitor may load. */
const ADMIN_LOGIN = "/admin/login";

/**
 * Optional second lock on the admin panel: a comma-separated IP allow-list.
 * Empty (the default) means "any IP, password still required".
 */
function ipAllowed(req: NextRequest): boolean {
  const list = (process.env.ADMIN_IP_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return true;

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";
  return list.includes(ip);
}

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const user = req.auth?.user;
  const isAdmin = ADMIN_ROLES.includes(user?.role as "OWNER" | "STAFF");

  // --- API ---------------------------------------------------------------
  if (pathname.startsWith("/api/v1")) {
    if (req.method === "OPTIONS") return preflight(req);
    return withCors(NextResponse.next(), req);
  }

  // --- Admin panel -------------------------------------------------------
  if (pathname.startsWith("/admin")) {
    if (!ipAllowed(req)) {
      // Deliberately a 404, not a 403: an attacker learns nothing about
      // whether an admin panel lives here at all.
      return new NextResponse(null, { status: 404 });
    }

    if (pathname === ADMIN_LOGIN) {
      return isAdmin
        ? NextResponse.redirect(new URL("/admin", req.nextUrl))
        : NextResponse.next();
    }

    if (!isAdmin) {
      const to = new URL(ADMIN_LOGIN, req.nextUrl);
      to.searchParams.set("next", pathname + search);
      return NextResponse.redirect(to);
    }

    return NextResponse.next();
  }

  // --- Customer areas ----------------------------------------------------
  if (CUSTOMER_PROTECTED.some((p) => pathname.startsWith(p))) {
    if (!user) {
      const to = new URL("/login", req.nextUrl);
      to.searchParams.set("next", pathname + search);
      return NextResponse.redirect(to);
    }
  }

  // A signed-in visitor has no use for the login page.
  if ((pathname === "/login" || pathname === "/register") && user) {
    return NextResponse.redirect(new URL("/account", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Everything except Next internals and static files. Keeping images and
     * fonts out of middleware matters: it runs on every matched request.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|woff2?)$).*)",
  ],
};
