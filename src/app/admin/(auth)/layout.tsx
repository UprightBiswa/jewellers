/**
 * The admin sign-in page deliberately shares nothing with the panel shell:
 * no nav, no store name, no links back into the shop. Someone who lands here
 * without an account should learn as little as possible.
 */
export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
