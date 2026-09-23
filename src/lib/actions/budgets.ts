"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { financialYearBounds } from "@/lib/finance";
import { AccountType, TxType } from "@/generated/prisma";

async function requireBudgetWrite() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session.role, "budgets", true)) redirect("/");
  return session;
}

/** Approving is the treasurer's, not the department's that asked. */
async function requireBudgetApprover() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session.role, "budgets:approve", true)) {
    throw new Error("Only the treasurer or the administrator can approve a budget.");
  }
  return session;
}

/**
 * Propose next year's budget from what was actually received and spent this
 * year.
 *
 * Only accounts that actually moved are included. A chart of accounts has
 * lines the church has never used, and a budget padded with zeroes for all of
 * them is a budget nobody reads. Anything genuinely new is added by hand.
 *
 * Income and expenditure both get the uplift. The treasurer is expected to go
 * through every line afterwards — this is a starting point drawn from real
 * figures, not a forecast.
 */
export async function draftNextYearBudget(formData: FormData) {
  const session = await requireBudgetWrite();

  const settings = await db.settings.findFirst();
  const fyStartMonth = settings?.financialYearStartMonth ?? 3;

  const basedOn = financialYearBounds(new Date(), fyStartMonth);
  const next = financialYearBounds(
    new Date(basedOn.start.getFullYear() + 1, basedOn.start.getMonth(), 1),
    fyStartMonth,
  );

  const uplift = Number(formData.get("uplift") ?? 0) || 0;
  const roundTo = Number(formData.get("roundTo") ?? 100) || 100;
  const departmentId = String(formData.get("departmentId") ?? "") || null;
  const department = departmentId
    ? await db.department.findUnique({ where: { id: departmentId } })
    : null;

  const existing = await db.budget.findFirst({
    where: { yearStart: next.start, departmentId },
  });
  if (existing) {
    redirect(`/budgets/${existing.id}`);
  }

  // A department's budget is drawn from what that department spent. The
  // church-wide budget is drawn from everything, income included.
  const actuals = await db.transaction.groupBy({
    by: ["accountId", "fundId"],
    where: {
      deletedAt: null,
      date: { gte: basedOn.start, lte: basedOn.end },
      type: department ? TxType.PAYMENT : { in: [TxType.RECEIPT, TxType.PAYMENT] },
      ...(department ? { departmentId } : {}),
    },
    _sum: { amount: true },
  });

  const accounts = await db.account.findMany({
    where: { id: { in: [...new Set(actuals.map((a) => a.accountId))] } },
  });
  const accountById = new Map(accounts.map((a) => [a.id, a]));

  const lines = actuals
    .filter((a) => {
      const acc = accountById.get(a.accountId);
      return acc && (acc.type === AccountType.INCOME || acc.type === AccountType.EXPENSE);
    })
    .map((a) => {
      const raw = (a._sum.amount ?? 0) * (1 + uplift / 100);
      return {
        accountId: a.accountId,
        fundId: a.fundId,
        amount: Math.round(raw / roundTo) * roundTo,
      };
    })
    .filter((l) => l.amount > 0);

  // A department with no tagged spending yet still gets a draft — an empty
  // one, for its leader to fill in line by line. The church-wide budget has
  // nothing to stand on without a year of figures.
  if (lines.length === 0 && !department) {
    throw new Error(
      `There is nothing posted in ${basedOn.label} to base a budget on.`,
    );
  }

  const budget = await db.budget.create({
    data: {
      name: department ? `${department.name} ${next.label}` : `Church budget ${next.label}`,
      departmentId,
      yearStart: next.start,
      yearEnd: next.end,
      status: "DRAFT",
      isActive: false,
      basedOnYearStart: basedOn.start,
      upliftPercent: uplift,
      lines: { create: lines },
    },
  });

  await db.auditLog.create({
    data: {
      userId: session.id,
      action: "CREATE",
      entity: "Budget",
      entityId: budget.id,
      summary: lines.length
        ? `Drafted ${budget.name} from ${basedOn.label} actuals${uplift ? ` with ${uplift}% uplift` : ""}`
        : `Started an empty draft of ${budget.name}`,
    },
  });

  revalidatePath("/budgets");
  redirect(`/budgets/${budget.id}`);
}

/** Save the amounts the treasurer has adjusted. */
export async function saveBudgetLines(id: string, formData: FormData) {
  await requireBudgetWrite();

  const budget = await db.budget.findUniqueOrThrow({
    where: { id },
    include: { lines: true },
  });
  if (budget.status === "APPROVED") {
    throw new Error("This budget has been approved. Approved figures are what the year is measured against and are not edited.");
  }

  for (const line of budget.lines) {
    const raw = formData.get(`amount_${line.id}`);
    if (typeof raw !== "string") continue;
    const amount = Number(raw.replace(/[^\d.-]/g, ""));
    if (Number.isNaN(amount)) continue;
    await db.budgetLine.update({ where: { id: line.id }, data: { amount } });
  }

  const notes = formData.get("notes");
  await db.budget.update({
    where: { id },
    data: { notes: typeof notes === "string" && notes.trim() ? notes.trim() : null },
  });

  revalidatePath(`/budgets/${id}`);
  redirect(`/budgets/${id}`);
}

export async function removeBudgetLine(budgetId: string, lineId: string) {
  await requireBudgetWrite();
  const budget = await db.budget.findUniqueOrThrow({ where: { id: budgetId } });
  if (budget.status === "APPROVED") throw new Error("This budget has been approved.");
  await db.budgetLine.delete({ where: { id: lineId } });
  revalidatePath(`/budgets/${budgetId}`);
}

export async function addBudgetLine(budgetId: string, formData: FormData) {
  await requireBudgetWrite();
  const budget = await db.budget.findUniqueOrThrow({ where: { id: budgetId } });
  if (budget.status === "APPROVED") throw new Error("This budget has been approved.");

  const accountId = String(formData.get("accountId") ?? "");
  const fundId = String(formData.get("fundId") ?? "") || null;
  const amount = Number(String(formData.get("amount") ?? "").replace(/[^\d.-]/g, ""));
  if (!accountId || Number.isNaN(amount)) throw new Error("Choose an account and give an amount.");

  // Not an upsert: the unique key includes a nullable fundId, and Prisma's
  // unique-where will not take null for it.
  const existing = await db.budgetLine.findFirst({
    where: { budgetId, accountId, fundId },
  });
  if (existing) {
    await db.budgetLine.update({ where: { id: existing.id }, data: { amount } });
  } else {
    await db.budgetLine.create({ data: { budgetId, accountId, fundId, amount } });
  }

  revalidatePath(`/budgets/${budgetId}`);
}

/**
 * Adopt the budget. From here it is what actuals are measured against, so it
 * stops being editable — a budget that can be changed after the fact cannot
 * hold anybody to anything.
 */
export async function approveBudget(id: string, formData: FormData) {
  const session = await requireBudgetApprover();
  const budget = await db.budget.findUniqueOrThrow({ where: { id } });

  await db.$transaction([
    // One approved budget per department per year, so no report is ambiguous
    // about which figures it is measuring against.
    db.budget.updateMany({
      where: { yearStart: budget.yearStart, departmentId: budget.departmentId, id: { not: id } },
      data: { isActive: false },
    }),
    db.budget.update({
      where: { id },
      data: {
        status: "APPROVED",
        isActive: true,
        approvedAt: new Date(),
        approvedBy: String(formData.get("approvedBy") ?? "").trim() || session.name,
      },
    }),
  ]);

  await db.auditLog.create({
    data: {
      userId: session.id,
      action: "UPDATE",
      entity: "Budget",
      entityId: id,
      summary: `Approved ${budget.name}`,
    },
  });

  revalidatePath("/budgets");
  redirect(`/budgets/${id}`);
}

export async function deleteBudget(id: string) {
  const session = await requireBudgetWrite();
  const budget = await db.budget.findUniqueOrThrow({ where: { id } });
  if (budget.status === "APPROVED") {
    throw new Error("An approved budget is part of the year's record and is not deleted.");
  }
  await db.budget.delete({ where: { id } });
  await db.auditLog.create({
    data: {
      userId: session.id, action: "DELETE", entity: "Budget", entityId: id,
      summary: `Discarded draft ${budget.name}`,
    },
  });
  revalidatePath("/budgets");
  redirect("/budgets");
}

/** Send a draft to the treasurer for approval. */
export async function submitBudgetForApproval(id: string) {
  const session = await requireBudgetWrite();
  const budget = await db.budget.findUniqueOrThrow({ where: { id }, include: { lines: true } });
  if (!budget.lines.length) throw new Error("Add at least one line before sending it for approval.");
  await db.budget.update({
    where: { id },
    data: { submittedAt: new Date(), submittedBy: session.name },
  });
  revalidatePath(`/budgets/${id}`);
  revalidatePath("/budgets");
}
