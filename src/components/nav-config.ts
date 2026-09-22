import type { Role } from "@/generated/prisma";

export type NavItem = {
  label: string;
  href: string;
  area: string;
  icon: string;
  /** Hidden unless the church is actually Section 18A approved. */
  requires18a?: boolean;
};

export type NavSection = { label: string | null; items: NavItem[] };

export const NAV: NavSection[] = [
  {
    label: null,
    items: [{ label: "Dashboard", href: "/", area: "reports", icon: "LayoutDashboard" }],
  },
  {
    label: "People",
    items: [
      { label: "Members", href: "/members", area: "members", icon: "Users" },
      { label: "Ministries", href: "/ministries", area: "members", icon: "HeartHandshake" },
      { label: "Attendance", href: "/attendance", area: "members", icon: "ClipboardCheck" },
      { label: "Baptisms", href: "/baptisms", area: "sacraments", icon: "Droplets" },
      { label: "Notebook", href: "/notes", area: "notes", icon: "NotebookPen" },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Contributions", href: "/contributions", area: "finance", icon: "HandCoins" },
      { label: "Expenses", href: "/expenses", area: "finance", icon: "Receipt" },
      { label: "Funds", href: "/funds", area: "finance", icon: "Wallet" },
      { label: "Chart of accounts", href: "/accounts", area: "finance", icon: "ListTree" },
      { label: "18A receipts", href: "/receipts", area: "finance", icon: "FileCheck", requires18a: true },
      { label: "Reports", href: "/reports", area: "reports", icon: "FileBarChart" },
    ],
  },
  {
    label: "Assets",
    items: [
      { label: "Register", href: "/assets", area: "assets", icon: "Package" },
      { label: "Stocktake", href: "/stocktake", area: "assets", icon: "ScanLine" },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "Planner", href: "/planner", area: "planner", icon: "CalendarDays" },
      { label: "Users", href: "/users", area: "users", icon: "Shield" },
      { label: "Settings", href: "/settings", area: "settings", icon: "Settings" },
    ],
  },
];

const PERMISSIONS: Record<Role, readonly string[]> = {
  ADMIN: ["members", "finance", "assets", "planner", "sacraments", "reports", "settings", "users", "notes"],
  TREASURER: ["members:read", "finance", "assets", "reports", "planner:read", "sacraments:read"],
  SECRETARY: ["members", "planner", "sacraments", "reports:read", "finance:read", "assets:read"],
  PASTOR: ["members:read", "finance:read", "assets:read", "planner:read", "sacraments", "reports:read", "notes"],
};

export function visibleNav(role: Role, is18aApproved = false): NavSection[] {
  const perms = PERMISSIONS[role];
  const allowed = (area: string) =>
    perms.includes(area) || perms.includes(`${area}:read`);

  return NAV.map((s) => ({
    ...s,
    items: s.items.filter((i) => allowed(i.area) && (!i.requires18a || is18aApproved)),
  })).filter((s) => s.items.length > 0);
}
