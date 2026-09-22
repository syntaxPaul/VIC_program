import { redirect } from "next/navigation";
import { getSession, ROLE_LABEL } from "@/lib/auth";
import { db } from "@/lib/db";
import { Shell } from "@/components/shell";
import { visibleNav } from "@/components/nav-config";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const settings = await db.settings.findFirst();

  return (
    <Shell
      nav={visibleNav(session.role, settings?.is18aApproved ?? false)}
      user={{ name: session.name, role: ROLE_LABEL[session.role] }}
      churchName={settings?.churchName ?? "Victory in Christ"}
    >
      {children}
    </Shell>
  );
}
