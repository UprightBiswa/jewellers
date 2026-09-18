import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig, canOpenPanel } from "@/auth.config";
import {
  ADMIN_GATE_COOKIE,
  ADMIN_IP_ALLOWLIST,
  ADMIN_LOGIN_PATH,
  adminDoorSecret,
} from "@/config/admin";
import { preflight, withCors } from "@/lib/api/cors";

const { auth } = NextAuth(authConfig);

/**
 * Routes a signed-out visitor must never reach.
 *
 * Checkout is deliberately NOT in this list. Someone in Tufanganj buying a pair
 * of toe rings should not have to create an account first — guest checkout takes
 * an email and an address. Signing in only buys the first-order discount and a
 * list of past orders, and the checkout page says so.
 */
const CUSTOMER_PROTECTED = ["/account"];

const ADMIN_LOGIN = ADMIN_LOGIN_PATH;

/**
 * A secret door to the panel.
 *
 * `/admin` answers 404 to anyone who has not first visited `/<secret>`; that
 * visit drops a cookie and forwards them to the panel. Nobody typing `/admin`
 * finds anything, and the panel is not linked from the shop at all.
 *
 * The secret is derived from AUTH_SECRET in `src/config/admin.ts` — it is not an
 * environment variable any more, and `npm run admin` prints the URL.
 *
 * This is obscurity, not the lock: the password and the staff-scoped session are
 * the lock. It exists so the panel is not a target in the first place.
 */

/** Optional second lock: an IP allow-list. Empty means any IP. */
function ipAllowed(req: NextRequest): boolean {
  if (ADMIN_IP_ALLOWLIST.length === 0) return true;

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";
  return ADMIN_IP_ALLOWLIST.includes(ip);
}

export default auth(async (req) => {
  const { pathname, search } = req.nextUrl;
  const user = req.auth?.user;

  // --- API ---------------------------------------------------------------
  if (pathname.startsWith("/api/v1")) {
    if (req.method === "OPTIONS") return preflight(req);
    return withCors(NextResponse.next(), req);
  }

  // Derived once per server instance, then memoised — see config/admin.ts.
  const adminSecret = await adminDoorSecret();

  // --- The secret door ---------------------------------------------------
  if (adminSecret && pathname === `/${adminSecret}`) {
    const to = NextResponse.redirect(new URL(ADMIN_LOGIN, req.nextUrl));
    to.cookies.set(ADMIN_GATE_COOKIE, adminSecret, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return to;
  }

  // --- Admin panel -------------------------------------------------------
  if (pathname.startsWith("/admin")) {
    // A 404, never a 403: an attacker learns nothing about whether a panel
    // lives here at all.
    if (adminSecret && req.cookies.get(ADMIN_GATE_COOKIE)?.value !== adminSecret) {
      return new NextResponse(null, { status: 404 });
    }
    if (!ipAllowed(req)) {
      return new NextResponse(null, { status: 404 });
    }

    // canOpenPanel needs the staff door, not just a staff role — an owner who
    // signed in on the shop has an ordinary customer session here.
    const mayEnter = canOpenPanel(user);

    if (pathname === ADMIN_LOGIN) {
      return mayEnter
        ? NextResponse.redirect(new URL("/admin", req.nextUrl))
        : NextResponse.next();
    }

    if (!mayEnter) {
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
     * fonts out of the proxy matters: it runs on every matched request.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|woff2?)$).*)",
  ],
};
