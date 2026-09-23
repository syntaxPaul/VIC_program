import Link from "next/link";
import { Plus, Printer, Search, UserPlus, Users } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate, enumLabel, initials } from "@/lib/format";
import {
  Badge, Button, Card, EmptyState, Input, PageHeader, Select,
  TableWrap, Td, Th,
} from "@/components/ui";
import type { MemberStatus, Prisma } from "@/generated/prisma";

const PAGE_SIZE = 25;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; ministry?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = sp.status ?? "";
  const ministry = sp.ministry ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.MemberWhereInput = {
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { surname: { contains: q, mode: "insensitive" } },
            { memberNumber: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(status ? { status: status as MemberStatus } : {}),
    ...(ministry ? { ministries: { some: { ministryId: ministry } } } : {}),
  };

  const [members, total, allTotal, ministries] = await Promise.all([
    db.member.findMany({
      where,
      orderBy: [{ surname: "asc" }, { fullName: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { ministries: { include: { ministry: true } } },
    }),
    db.member.count({ where }),
    db.member.count({ where: { deletedAt: null } }),
    db.ministry.findMany({ orderBy: { name: "asc" } }),
  ]);

  const pages = Math.ceil(total / PAGE_SIZE);
  const filtered = Boolean(q || status || ministry);

  return (
    <div className="mx-auto max-w-[1400px] 2xl:max-w-[1760px]">
      <PageHeader
        title="Members"
        description={
          filtered
            ? `${total} of ${allTotal} members match your filters`
            : `${allTotal} members on the roll`
        }
        actions={
          <>
            <Link href={`/members/print?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), ...(ministry ? { ministry } : {}) }).toString()}`}>
              <Button><Printer size={15} /> Print</Button>
            </Link>
            <Link href="/members/new">
              <Button variant="primary">
                <Plus size={15} /> Register member
              </Button>
            </Link>
          </>
        }
      />

      <Card className="mb-4">
        <form className="flex flex-wrap items-end gap-3 p-3">
          <div className="relative min-w-56 flex-1">
            <Search
              size={15}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Search name, number, email or phone…"
              className="pl-9"
            />
          </div>
          <Select name="status" defaultValue={status} className="w-full sm:w-40">
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="TRANSFERRED">Transferred</option>
            <option value="DECEASED">Deceased</option>
          </Select>
          <Select name="ministry" defaultValue={ministry} className="w-full sm:w-48">
            <option value="">All ministries</option>
            {ministries.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
          <Button type="submit">Apply</Button>
          {filtered ? (
            <Link href="/members">
              <Button type="button" variant="ghost">Clear</Button>
            </Link>
          ) : null}
        </form>
      </Card>

      <Card className="overflow-hidden">
        {members.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={<Search size={18} />}
              title="No members match these filters"
              description="Try a different search term, or clear the filters to see everyone."
              action={
                <Link href="/members">
                  <Button>Clear filters</Button>
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={<Users size={18} />}
              title="No members registered yet"
              description="Register your first member to start building the church roll."
              action={
                <Link href="/members/new">
                  <Button variant="primary">
                    <UserPlus size={15} /> Register member
                  </Button>
                </Link>
              }
            />
          )
        ) : (
          <>
            <TableWrap>
              <thead>
                <tr>
                  <Th>Member</Th>
                  <Th>Number</Th>
                  <Th>Contact</Th>
                  <Th>Ministry</Th>
                  <Th>Status</Th>
                  <Th>Joined</Th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-sand-50 dark:hover:bg-sand-800/40">
                    <Td label="Member">
                      <Link href={`/members/${m.id}`} className="flex items-center gap-2.5 group">
                        {m.photoPath ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/photo/${m.photoPath}`}
                            alt=""
                            className="h-8 w-8 shrink-0 rounded-full border object-cover"
                          />
                        ) : (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand-100 text-[11.5px] font-semibold text-sand-600 dark:bg-sand-800 dark:text-sand-300">
                            {initials(m.fullName)}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate font-medium group-hover:underline">
                            {m.fullName}
                          </span>
                          {m.dob ? (
                            <span className="block text-[12px] text-[var(--text-muted)]">
                              {enumLabel(m.gender)} · {formatDate(m.dob)}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </Td>
                    <Td label="Number" className="tnum text-[var(--text-muted)]">{m.memberNumber}</Td>
                    <Td label="Contact">
                      <span className="block text-[13px]">{m.phone ?? "—"}</span>
                      {m.email ? (
                        <span className="block truncate text-[12px] text-[var(--text-muted)]">
                          {m.email}
                        </span>
                      ) : null}
                    </Td>
                    <Td label="Ministry">
                      <div className="flex flex-wrap gap-1">
                        {m.ministries.slice(0, 2).map((mm) => (
                          <Badge key={mm.ministryId} tone="brand">
                            {mm.ministry.name}
                          </Badge>
                        ))}
                        {m.ministries.length > 2 ? (
                          <Badge>+{m.ministries.length - 2}</Badge>
                        ) : null}
                      </div>
                    </Td>
                    <Td label="Status">
                      <Badge
                        tone={
                          m.status === "ACTIVE"
                            ? "success"
                            : m.status === "INACTIVE"
                              ? "neutral"
                              : "warning"
                        }
                      >
                        {enumLabel(m.status)}
                      </Badge>
                    </Td>
                    <Td label="Joined" className="tnum text-[var(--text-muted)]">
                      {formatDate(m.registrationDate)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>

            {pages > 1 ? (
              <div className="flex items-center justify-between border-t px-4 py-3 text-[13px]">
                <span className="text-[var(--text-muted)]">
                  Showing {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, total)} of {total}
                </span>
                <div className="flex gap-2">
                  {page > 1 ? (
                    <Link
                      href={{ pathname: "/members", query: { ...sp, page: page - 1 } }}
                    >
                      <Button size="sm">Previous</Button>
                    </Link>
                  ) : null}
                  {page < pages ? (
                    <Link
                      href={{ pathname: "/members", query: { ...sp, page: page + 1 } }}
                    >
                      <Button size="sm">Next</Button>
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        )}
      </Card>
    </div>
  );
}
