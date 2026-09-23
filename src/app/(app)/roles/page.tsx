import { redirect } from "next/navigation";
import { Check, Eye, Minus } from "lucide-react";
import { getSession } from "@/lib/auth";
import { can, PERMISSIONS, ROLE_DUTIES, ROLE_LABEL, ROLE_ORDER } from "@/lib/roles";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";

const AREAS: { key: string; label: string }[] = [
  { key: "members", label: "Members and attendance" },
  { key: "applications", label: "Membership forms" },
  { key: "sacraments", label: "Baptisms and consecrations" },
  { key: "children", label: "Children's church" },
  { key: "youth", label: "Youth and word study" },
  { key: "welfare", label: "Health and welfare" },
  { key: "outreach", label: "Outreach" },
  { key: "planner", label: "Planner" },
  { key: "tithes", label: "Tithes, offerings and board pack" },
  { key: "finance", label: "Finance" },
  { key: "budgets", label: "Budgets" },
  { key: "budgets:approve", label: "Approve budgets" },
  { key: "departments", label: "Departments" },
  { key: "assets", label: "Asset register" },
  { key: "reports", label: "Reports" },
  { key: "notes", label: "Notebook" },
  { key: "users", label: "Users" },
  { key: "settings", label: "Settings" },
];

export default async function RolesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  // Who can reach what is the administrator's business — it is how accounts
  // are handed out — not something every office needs to read.
  if (!can(session.role, "users", true)) redirect("/");

  return (
    <div className="mx-auto max-w-[1000px] 2xl:max-w-[1240px]">
      <PageHeader
        title="Offices"
        description="What each office takes care of, and what it can reach in the system."
      />

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        {ROLE_ORDER.map((role) => {
          const { summary, duties } = ROLE_DUTIES[role];
          const yours = session.role === role;
          return (
            <Card key={role} className={yours ? "border-bronze-300" : undefined}>
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    {ROLE_LABEL[role]}
                    {yours ? <Badge tone="brand">Yours</Badge> : null}
                  </span>
                }
                subtitle={summary}
              />
              <ul className="space-y-2 px-5 py-4">
                {duties.map((d) => (
                  <li key={d} className="flex gap-2 text-[13.5px] leading-relaxed">
                    <span className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-bronze-300" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      <Card className="sm:overflow-x-auto">
        <CardHeader
          title="Who can reach what"
          subtitle="A tick can change things; an eye can look but not touch"
        />
        <table className="stacked-table w-full sm:min-w-[640px]">
          <thead>
            <tr className="border-b text-[12px] text-[var(--text-muted)]">
              <th className="px-4 py-2 text-left font-medium">Area</th>
              {ROLE_ORDER.map((r) => (
                <th key={r} className="px-2 py-2 text-center font-medium">
                  {ROLE_LABEL[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AREAS.map((a) => (
              <tr key={a.key} className="border-b last:border-0">
                <td className="px-4 py-2 text-[13.5px]">{a.label}</td>
                {ROLE_ORDER.map((r) => {
                  const perms: readonly string[] = PERMISSIONS[r];
                  const write = perms.includes(a.key);
                  const read = perms.includes(`${a.key}:read`);
                  return (
                    <td key={r} data-label={ROLE_LABEL[r]} className="px-2 py-2 text-center">
                      {write ? (
                        <Check size={15} className="sm:mx-auto text-success" aria-label="Can change" />
                      ) : read ? (
                        <Eye size={15} className="sm:mx-auto text-[var(--text-muted)]" aria-label="Can see" />
                      ) : (
                        <Minus size={14} className="sm:mx-auto text-[var(--border)]" aria-label="No access" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
