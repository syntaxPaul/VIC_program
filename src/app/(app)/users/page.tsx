import { redirect } from "next/navigation";
import { Shield } from "lucide-react";
import { db } from "@/lib/db";
import { getSession, ROLE_LABEL } from "@/lib/auth";
import { saveUser } from "@/lib/actions/admin";
import { formatDate } from "@/lib/format";
import {
  Badge, Button, Card, CardHeader, Field, Input, PageHeader,
  Select, TableWrap, Td, Th,
} from "@/components/ui";

const ROLE_BLURB = {
  ADMIN: "Everything, including users and settings",
  TREASURER: "Finance and assets; read-only elsewhere",
  SECRETARY: "Members, planner and sacraments",
  PASTOR: "Read-only across the board, plus sacraments",
} as const;

export default async function UsersPage() {
  const session = await getSession();
  if (session?.role !== "ADMIN") redirect("/");

  const users = await db.user.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader title="Users and roles" description="Who can sign in, and what they may do." />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden">
          <CardHeader title="Accounts" />
          <TableWrap>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Last signed in</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-sand-50 dark:hover:bg-sand-800/40">
                  <Td className="font-medium">{u.name}</Td>
                  <Td className="text-[13px] text-[var(--text-muted)]">{u.email}</Td>
                  <Td><Badge tone="brand">{ROLE_LABEL[u.role]}</Badge></Td>
                  <Td>
                    <Badge tone={u.isActive ? "success" : "neutral"}>
                      {u.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </Td>
                  <Td className="tnum text-[12.5px] text-[var(--text-muted)]">
                    {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>

          <div className="border-t p-5">
            <p className="mb-2.5 text-[12px] font-semibold tracking-wide text-[var(--text-muted)] uppercase">
              What each role can do
            </p>
            <dl className="space-y-2">
              {(Object.keys(ROLE_BLURB) as (keyof typeof ROLE_BLURB)[]).map((r) => (
                <div key={r} className="flex gap-3 text-[13px]">
                  <dt className="w-28 shrink-0 font-medium">{ROLE_LABEL[r]}</dt>
                  <dd className="text-[var(--text-muted)]">{ROLE_BLURB[r]}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Card>

        <Card className="h-fit">
          <CardHeader title="Add user" />
          <form action={saveUser.bind(null, null)}>
            <div className="space-y-4 p-5">
              <Field label="Name">
                <Input name="name" required />
              </Field>
              <Field label="Email">
                <Input name="email" type="email" required />
              </Field>
              <Field label="Role">
                <Select name="role" defaultValue="SECRETARY">
                  {(Object.keys(ROLE_BLURB) as (keyof typeof ROLE_BLURB)[]).map((r) => (
                    <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Password" hint="They should change this after first sign-in">
                <Input name="password" type="password" required minLength={6} />
              </Field>
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked
                  className="h-4 w-4 accent-[var(--brand)]"
                />
                Account is active
              </label>
            </div>
            <div className="border-t px-5 py-3">
              <Button type="submit" variant="primary" className="w-full">
                <Shield size={15} /> Create user
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
