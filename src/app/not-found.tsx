import Link from "next/link";

/**
 * Root 404, for URLs outside the shop's route groups. The shop's own 404 lives
 * at (shop)/not-found.tsx and is far more useful — this one exists so a stray
 * path still lands somewhere deliberate.
 */
export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4 text-center">
      <meta name="robots" content="noindex, nofollow" />
      <div className="max-w-sm">
        <h1 className="font-display text-2xl text-ink">Page not found</h1>
        <p className="mt-2 text-[15px] text-ink-2">
          That address does not exist on this site.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-lg bg-brand px-5 py-2.5 text-[15px] font-medium text-on-brand"
        >
          Go to the shop
        </Link>
      </div>
    </div>
  );
}
