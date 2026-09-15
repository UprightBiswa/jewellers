import Link from "next/link";
import { Database } from "lucide-react";

/**
 * Shown in development when nothing is listening where DATABASE_URL points.
 *
 * The storefront can run on demo data, but the admin cannot: signing in reads
 * the user table and every screen writes. So rather than a shell full of broken
 * panels, it says what is missing and exactly which two commands fix it.
 */
export function NoDatabaseNotice() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-lg rounded-[var(--radius-card)] border border-line bg-surface p-7">
        <span className="grid size-10 place-items-center rounded-lg bg-warn-soft text-warn">
          <Database className="size-5" aria-hidden />
        </span>

        <h1 className="mt-4 font-display text-xl text-ink">No database connected</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          The shop front is running on preview data, but the admin needs a real database —
          signing in reads your account, and every screen here saves something.
        </p>

        <ol className="mt-5 grid gap-3 text-[14.5px] text-ink-2">
          <li>
            <span className="font-medium text-ink">1.</span> Create a free Postgres database
            at{" "}
            <a
              href="https://neon.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand underline underline-offset-4"
            >
              neon.tech
            </a>
            .
          </li>
          <li>
            <span className="font-medium text-ink">2.</span> Put both connection strings in{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[13px]">.env.local</code> as{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[13px]">DATABASE_URL</code> and{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[13px]">DIRECT_URL</code>.
          </li>
          <li>
            <span className="font-medium text-ink">3.</span> Run:
            <pre className="mt-1.5 overflow-x-auto rounded-lg bg-surface-2 p-3 text-[13px] leading-relaxed text-ink">
{`npx prisma migrate dev --name init
npm run db:seed`}
            </pre>
          </li>
        </ol>

        <p className="mt-5 text-[13.5px] text-muted">
          The seed creates your owner account and fills the shop with example products you
          can edit.
        </p>

        <Link
          href="/"
          className="mt-5 inline-block text-sm font-medium text-brand underline-offset-4 hover:underline"
        >
          Look at the shop front instead
        </Link>
      </div>
    </div>
  );
}
