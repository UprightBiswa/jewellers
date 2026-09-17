import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AccountNav } from "@/components/storefront/account-nav";

export const dynamic = "force-dynamic";

/**
 * Everything under /account needs a signed-in customer.
 *
 * The proxy already redirects, but checking here too means a missed matcher
 * pattern cannot leak someone's order history — the same belt-and-braces rule
 * the admin panel follows.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?next=/account");
  }

  return (
    <div className="container-page py-8">
      <header className="border-b border-line pb-6">
        <p className="text-[11px] uppercase tracking-[0.16em] text-gold">Your account</p>
        <h1 className="mt-2 font-display text-[clamp(1.7rem,4.5vw,2.2rem)] text-ink">
          {session.user.name ?? "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-muted">{session.user.email}</p>
      </header>

      <div className="mt-6 grid gap-8 lg:grid-cols-[210px_1fr] lg:gap-12">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>

      <p className="mt-16 border-t border-line pt-6 text-[13px] text-muted">
        Need help with an order?{" "}
        <Link href="/contact" className="text-brand underline underline-offset-4">
          Message the shop
        </Link>
        .
      </p>
    </div>
  );
}
