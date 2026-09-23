import type { Role } from "@/generated/prisma";
import { PERMISSIONS } from "@/lib/roles";

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
      { label: "Membership forms", href: "/applications", area: "applications", icon: "Inbox" },
      { label: "Attendance", href: "/attendance", area: "members", icon: "ClipboardCheck" },
      { label: "Baptisms", href: "/baptisms", area: "sacraments", icon: "Droplets" },
      { label: "Consecrations", href: "/consecrations", area: "sacraments", icon: "Baby" },
      { label: "Notebook", href: "/notes", area: "notes", icon: "NotebookPen" },
    ],
  },
  {
    label: "Ministries",
    items: [
      { label: "Children's church", href: "/children", area: "children", icon: "Blocks" },
      { label: "Youth", href: "/youth", area: "youth", icon: "Flame" },
      { label: "Health & welfare", href: "/welfare", area: "welfare", icon: "HeartHandshake" },
      { label: "Outreach", href: "/outreach", area: "outreach", icon: "Megaphone" },
      { label: "Ministry groups", href: "/ministries", area: "members", icon: "UsersRound" },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Tithes & offerings", href: "/tithes", area: "tithes", icon: "HandCoins" },
      { label: "Counted offerings", href: "/contributions", area: "finance", icon: "Coins" },
      { label: "Expenses", href: "/expenses", area: "finance", icon: "Receipt" },
      { label: "Funds", href: "/funds", area: "finance", icon: "Wallet" },
      { label: "Budgets", href: "/budgets", area: "budgets", icon: "Target" },
      { label: "Board pack", href: "/reports/board-pack", area: "tithes", icon: "Presentation" },
      { label: "Reports", href: "/reports", area: "reports", icon: "FileBarChart" },
      { label: "Chart of accounts", href: "/accounts", area: "finance", icon: "ListTree" },
      { label: "18A receipts", href: "/receipts", area: "finance", icon: "FileCheck", requires18a: true },
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
      { label: "Departments", href: "/departments", area: "departments", icon: "Building2" },
      { label: "Offices", href: "/roles", area: "users", icon: "IdCard" },
      { label: "Users", href: "/users", area: "users", icon: "Shield" },
      { label: "Settings", href: "/settings", area: "settings", icon: "Settings" },
    ],
  },
];


export function visibleNav(role: Role, is18aApproved = false): NavSection[] {
  const perms: readonly string[] = PERMISSIONS[role];
  const allowed = (area: string) =>
    perms.includes(area) || perms.includes(`${area}:read`);

  return NAV.map((s) => ({
    ...s,
    items: s.items.filter((i) => allowed(i.area) && (!i.requires18a || is18aApproved)),
  })).filter((s) => s.items.length > 0);
}
