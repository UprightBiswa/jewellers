import { redirect } from "next/navigation";
import { auth, isAdminRole } from "@/auth";
import { getSettings } from "@/lib/settings";
import { AdminShell } from "@/components/admin/shell";

export const dynamic = "force-dynamic";

/**
 * Second gate on the panel. Middleware already redirects a non-admin, but a
 * layout check means a missed matcher pattern still cannot leak an admin page.
 */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
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
