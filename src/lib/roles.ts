import type { Role } from "@/generated/prisma";

/**
 * The offices of the church, and what each one may reach.
 *
 * This is the single source of truth. It used to be written out twice — once
 * for the sidebar and once for the server-side check — which is exactly the
 * kind of duplication that lets a role quietly gain access to a page nobody
 * meant to give it.
 *
 * An area on its own means write; "area:read" means look but do not touch.
 */
export const PERMISSIONS = {
  ADMIN: [
    "members", "finance", "assets", "planner", "sacraments", "reports",
    "settings", "users", "notes", "applications", "budgets", "budgets:approve",
    "welfare", "children", "youth", "outreach", "departments", "tithes",
  ],
  PASTOR: [
    // Oversight: sees everything, changes what belongs to the pastoral office.
    "members:read", "finance:read", "assets:read", "planner:read",
    "sacraments", "reports:read", "notes", "applications:read",
    "budgets:read", "welfare:read", "children:read", "youth:read",
    "outreach:read", "departments:read", "tithes:read",
  ],
  TREASURER: [
    // The money, and nothing that is not the money. Assets appear on the
    // treasurer's home as a value and a status — keeping the register itself
    // is the office's job, not the treasury's.
    "members:read", "finance", "reports", "planner:read", "sacraments:read",
    "budgets", "budgets:approve", "tithes", "departments:read", "welfare:read",
  ],
  SECRETARY: [
    "members", "planner", "sacraments", "applications", "assets",
    "reports:read", "finance:read", "budgets:read", "departments:read",
    "children:read", "youth:read", "outreach:read",
  ],
  DISCIPLESHIP: [
    // Everything that grows people: classes and baptisms, children's church,
    // the youth divisions and their word study, and health and welfare.
    "members", "sacraments", "planner:read", "reports:read", "applications:read",
    "welfare", "children", "youth", "outreach:read",
    "budgets", "departments:read",
  ],
  EVANGELIST: [
    // Brings people in and follows them up; the register itself is the
    // secretary's to keep, so applications are read-only here.
    "members", "planner:read", "sacraments:read", "reports:read", "applications:read",
    "outreach", "welfare:read", "budgets", "departments:read",
  ],
} as const satisfies Record<Role, readonly string[]>;

export function can(role: Role, area: string, write = false): boolean {
  const perms: readonly string[] = PERMISSIONS[role];
  if (perms.includes(area)) return true;
  if (!write && perms.includes(`${area}:read`)) return true;
  return false;
}

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  PASTOR: "Pastor",
  TREASURER: "Treasurer",
  SECRETARY: "Secretary",
  DISCIPLESHIP: "Discipleship",
  EVANGELIST: "Evangelist",
};

/** The order offices are listed in, which is the order the church uses. */
export const ROLE_ORDER: Role[] = [
  "PASTOR", "DISCIPLESHIP", "EVANGELIST", "TREASURER", "SECRETARY", "ADMIN",
];

/**
 * What each office takes care of, in the church's own terms rather than the
 * system's. Shown on the Roles page so that whoever hands out an account can
 * see what they are handing over.
 */
export const ROLE_DUTIES: Record<Role, { summary: string; duties: string[] }> = {
  PASTOR: {
    summary: "Oversight of the congregation and its spiritual life.",
    duties: [
      "Keeps the notebook — sermon notes, meeting notes, visits and follow-ups, including confidential pastoral matters",
      "Officiates baptisms and signs certificates",
      "Sees the whole picture: members, finances, assets and the calendar, without changing the records",
      "Reads membership applications as they come in",
    ],
  },
  DISCIPLESHIP: {
    summary: "New believers, children, youth, and the care of those in need.",
    duties: [
      "Runs baptism classes and child consecrations",
      "Leads children's church: its sessions, lessons and activities",
      "Oversees the youth divisions — intermediate, youth, young adults and men — and their word study",
      "Runs health and welfare: food, clothing and other help the church gives",
      "Drafts the budgets for these departments for the treasurer to approve",
    ],
  },
  EVANGELIST: {
    summary: "Outreach, and the people it brings in.",
    duties: [
      "Plans outreaches of every kind — street, door-to-door, crusades, hospitals, prisons, schools",
      "Records who was reached, who gave their lives, and who needs following up",
      "Registers people met through outreach and follows up visitors",
      "Drafts the evangelism budget for the treasurer to approve",
    ],
  },
  TREASURER: {
    summary: "The church's money.",
    duties: [
      "Records tithes and offerings — who gave, and the total",
      "Counts and posts the offerings, with a second counter on every batch",
      "Captures expenses against the right fund and account",
      "Approves every department's budget",
      "Presents the board pack: income, spending, funds and budgets, with graphs",
    ],
  },
  SECRETARY: {
    summary: "The register, the calendar and the paperwork.",
    duties: [
      "Keeps the membership register and accepts applications from the public form",
      "Maintains the church planner and the year plan",
      "Records baptisms and consecrations, and issues their certificates",
      "Keeps the asset register and runs the annual stocktake",
    ],
  },
  ADMIN: {
    summary: "Runs the system itself.",
    duties: [
      "Creates and deactivates accounts, and sets who holds which office",
      "Maintains the church details, financial year and registration numbers",
      "Has access to everything, including the notebook, for continuity",
      "Should be held by one or two people only",
    ],
  },
};
