import Link from "next/link";
import { getSettings } from "@/lib/settings";

/**
 * Auth pages get their own minimal chrome: no header, no nav, no offer strip.
 * Someone signing in or resetting a password is doing one thing, and every
 * other link on the page is a way to fail at it.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { store } = await getSettings();

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="border-b border-line">
        <div className="container-page flex h-16 items-center">
          <Link href="/" className="font-display text-xl text-ink">
            {store.name}
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="border-t border-line py-5">
        <div className="container-page flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] text-muted">
          <Link href="/pages/privacy-policy" className="hover:text-ink">Privacy</Link>
          <Link href="/pages/terms" className="hover:text-ink">Terms</Link>
          <Link href="/contact" className="hover:text-ink">Help</Link>
        </div>
      </footer>
    </div>
  );
}
