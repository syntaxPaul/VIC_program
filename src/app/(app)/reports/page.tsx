import Link from "next/link";
import {
  FileBarChart, Wallet, CalendarRange, Target, Scale, UserSquare,
  FileCheck, Package, Presentation,
} from "lucide-react";
import { db } from "@/lib/db";
import { financialYearBounds } from "@/lib/finance";
import { today } from "@/lib/demo";
import { Card, PageHeader } from "@/components/ui";

const REPORTS = [
  {
    href: "/reports/board-pack",
    icon: Presentation,
    title: "Board pack",
    blurb: "Everything the board asks for in one document — the year's figures and graphs, funds, every department against its budget, giving and what the church owns.",
  },
  {
    href: "/reports/income-expenditure",
    icon: FileBarChart,
    title: "Income & Expenditure Statement",
    blurb: "Income and expenses by account for the period, with the surplus or deficit. The core statement for the NPO annual return.",
  },
  {
    href: "/reports/fund-balances",
    icon: Wallet,
    title: "Fund Balance Report",
    blurb: "Opening balance, income, expenditure, transfers and closing balance per fund. The report the church council reads.",
  },
  {
    href: "/reports/monthly-comparison",
    icon: CalendarRange,
    title: "Monthly Comparison",
    blurb: "Accounts down, months across, with a year-to-date total. Exposes anomalies at a glance.",
  },
  {
    href: "/reports/budget-vs-actual",
    icon: Target,
    title: "Budget vs Actual",
    blurb: "Budget, actual and variance per account, in rand and percent.",
  },
  {
    href: "/reports/financial-position",
    icon: Scale,
    title: "Statement of Financial Position",
    blurb: "Assets, liabilities and fund balances split by restriction class.",
  },
  {
    href: "/reports/contributions",
    icon: UserSquare,
    title: "Contributions by Member",
    blurb: "What each member gave over the period — for pastoral care and donor statements.",
  },
];

export default async function ReportsPage() {
  const settings = await db.settings.findFirst();
  const fy = financialYearBounds(today(), settings?.financialYearStartMonth ?? 3);

  const reports = [
    ...REPORTS,
    ...(settings?.is18aApproved
      ? [{
          href: "/reports/18a-register",
          icon: FileCheck,
          title: "Section 18A Register",
          blurb: "Every 18A receipt issued in the period, in a shape that reconciles to the IT3(d) submission due 31 October and 31 May.",
        }]
      : []),
    {
      href: "/reports/asset-register",
      icon: Package,
      title: "Fixed Asset Register",
      blurb: "Every asset with cost, accumulated depreciation and net book value, grouped by category.",
    },
  ];

  return (
    <div className="mx-auto max-w-[1000px] 2xl:max-w-[1240px]">
      <PageHeader
        title="Reports"
        description={`All reports default to financial year ${fy.label} (1 March – end February) and print to A4.`}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {reports.map((r) => (
          <Link key={r.href} href={r.href} className="group">
            <Card className="h-full p-5 transition-colors group-hover:border-bronze-300">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-bronze-50 text-bronze-600 dark:bg-bronze-600/20 dark:text-bronze-300">
                <r.icon size={17} />
              </div>
              <h2 className="text-[14.5px] font-semibold group-hover:underline">{r.title}</h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                {r.blurb}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
