import { redirect } from "next/navigation";
import { auth, isAdminRole } from "@/auth";
import { getSettings } from "@/lib/settings";
import { databaseReachable } from "@/lib/demo/fallback";
import { AdminShell } from "@/components/admin/shell";
import { NoDatabaseNotice } from "@/components/admin/no-database-notice";

export const dynamic = "force-dynamic";

/**
 * Second gate on the panel. Middleware already redirects a non-admin, but a
 * layout check means a missed matcher pattern still cannot leak an admin page.
 */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  // Unlike the storefront, the admin has no meaningful preview: signing in reads
  // the user table, and every screen writes. So in development it says plainly
  // that there is no database rather than rendering a shell full of errors.
  if (!(await databaseReachable())) {
    return <NoDatabaseNotice />;
  }

  const session = await auth();

  if (!session?.user || !isAdminRole(session.user.role)) {
    redirect("/admin/login");
  }

  const settings = await getSettings();

  return (
    <AdminShell
      storeName={settings.store.name}
      user={{
        name: session.user.name ?? "Staff",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
    >
      {children}
    </AdminShell>
  );
}
