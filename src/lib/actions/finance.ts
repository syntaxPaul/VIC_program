"use server";

import { requireArea } from "@/lib/guards";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { PayMethod } from "@/generated/prisma";

function str(fd: FormData, k: string) {
  const v = fd.get(k);
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

function num(fd: FormData, k: string) {
  const s = str(fd, k);
  if (!s) return 0;
  // accept "1 234,56" and "1234.56"
  const n = parseFloat(s.replace(/[\s ]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function dt(fd: FormData, k: string) {
  const s = str(fd, k);
  const d = s ? new Date(s) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/* ── expenses / payments ─────────────────────────────────────────── */

export async function saveExpense(id: string | null, formData: FormData) {
  const session = await requireArea("finance", true);

  const amount = num(formData, "amount");
  if (amount <= 0) throw new Error("Amount must be greater than zero.");

  const data = {
    date: dt(formData, "date"),
    type: "PAYMENT" as const,
    description: str(formData, "description") ?? "Payment",
    payee: str(formData, "payee"),
    reference: str(formData, "reference"),
    amount,
    method: (str(formData, "method") as PayMethod) ?? "EFT",
    fundId: str(formData, "fundId")!,
    accountId: str(formData, "accountId")!,
    departmentId: str(formData, "departmentId"),
  };

  if (!data.fundId || !data.accountId) {
    throw new Error("Both a fund and an expense account are required.");
  }

  const tx = id
    ? await db.transaction.update({ where: { id }, data })
    : await db.transaction.create({
        data: { ...data, createdById: session.id, postedAt: new Date() },
      });

  await db.auditLog.create({
    data: {
      userId: session.id,
      action: id ? "UPDATE" : "CREATE",
      entity: "Transaction",
      entityId: tx.id,
      summary: `${id ? "Updated" : "Recorded"} payment ${data.description}`,
    },
  });

  revalidatePath("/expenses");
  revalidatePath("/");
  redirect("/expenses");
}

export async function voidTransaction(id: string) {
  const session = await requireArea("finance", true);

  await db.transaction.update({ where: { id }, data: { deletedAt: new Date() } });
  await db.auditLog.create({
    data: {
      userId: session.id,
      action: "DELETE",
      entity: "Transaction",
      entityId: id,
      summary: "Voided transaction",
    },
  });

  revalidatePath("/expenses");
  revalidatePath("/");
}

/* ── offering batches ────────────────────────────────────────────── */

async function nextBatchNumber(year: number) {
  const count = await db.batch.count({
    where: { serviceDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
  });
  return `B${year}-${String(count + 1).padStart(3, "0")}`;
}

export async function createBatch(formData: FormData) {
  const session = await requireArea("finance", true);

  const serviceDate = dt(formData, "serviceDate");
  const batch = await db.batch.create({
    data: {
      batchNumber: await nextBatchNumber(serviceDate.getFullYear()),
      serviceDate,
      serviceName: str(formData, "serviceName") ?? "Sunday Service",
      expectedTotal: num(formData, "expectedTotal") || null,
      counter1Name: str(formData, "counter1Name"),
      counter2Name: str(formData, "counter2Name"),
      createdById: session.id,
    },
  });

  revalidatePath("/contributions");
  redirect(`/contributions/${batch.id}`);
}

export async function addContributionLine(batchId: string, formData: FormData) {
  await requireArea("finance", true);

  const batch = await db.batch.findUniqueOrThrow({ where: { id: batchId } });
  if (batch.status === "POSTED") {
    throw new Error("This batch is posted and can no longer be edited.");
  }

  const amount = num(formData, "amount");
  if (amount <= 0) throw new Error("Amount must be greater than zero.");

  await db.contributionLine.create({
    data: {
      batchId,
      memberId: str(formData, "memberId"),
      fundId: str(formData, "fundId")!,
      accountId: str(formData, "accountId")!,
      amount,
      method: (str(formData, "method") as PayMethod) ?? "CASH",
      reference: str(formData, "reference"),
      note: str(formData, "note"),
    },
  });

  revalidatePath(`/contributions/${batchId}`);
}

export async function removeContributionLine(batchId: string, lineId: string) {
  await requireArea("finance", true);

  const batch = await db.batch.findUniqueOrThrow({ where: { id: batchId } });
  if (batch.status === "POSTED") throw new Error("This batch is posted.");

  await db.contributionLine.delete({ where: { id: lineId } });
  revalidatePath(`/contributions/${batchId}`);
}

export async function advanceBatch(batchId: string, to: "COUNTED" | "REVIEWED" | "POSTED") {
  const session = await requireArea("finance", true);

  const batch = await db.batch.findUniqueOrThrow({
    where: { id: batchId },
    include: { lines: true },
  });

  if (batch.status === "POSTED") throw new Error("This batch is already posted.");
  if (to !== "COUNTED" && batch.lines.length === 0) {
    throw new Error("Add at least one contribution line first.");
  }

  if (to === "COUNTED") {
    await db.batch.update({
      where: { id: batchId },
      data: { status: "COUNTED", countedAt: new Date() },
    });
  }

  if (to === "REVIEWED") {
    await db.batch.update({
      where: { id: batchId },
      data: { status: "REVIEWED", reviewedById: session.id, reviewedAt: new Date() },
    });
  }

  if (to === "POSTED") {
    // group lines by fund + account, write one ledger transaction each
    const grouped = new Map<string, number>();
    for (const l of batch.lines) {
      const k = `${l.fundId}|${l.accountId}`;
      grouped.set(k, (grouped.get(k) ?? 0) + l.amount);
    }

    await db.$transaction([
      ...[...grouped.entries()].map(([k, amount]) => {
        const [fundId, accountId] = k.split("|");
        return db.transaction.create({
          data: {
            date: batch.serviceDate,
            type: "RECEIPT" as const,
            description: `Offering — ${batch.batchNumber}`,
            amount: Math.round(amount * 100) / 100,
            method: "CASH" as const,
            fundId,
            accountId,
            batchId: batch.id,
            createdById: session.id,
            postedAt: new Date(),
          },
        });
      }),
      db.batch.update({
        where: { id: batchId },
        data: { status: "POSTED", postedAt: new Date() },
      }),
    ]);
  }

  await db.auditLog.create({
    data: {
      userId: session.id,
      action: to === "POSTED" ? "POST" : "APPROVE",
      entity: "Batch",
      entityId: batchId,
      summary: `Batch ${batch.batchNumber} → ${to}`,
    },
  });

  revalidatePath(`/contributions/${batchId}`);
  revalidatePath("/contributions");
  revalidatePath("/");
}

/* ── funds ───────────────────────────────────────────────────────── */

export async function saveFund(id: string | null, formData: FormData) {
  await requireArea("finance", true);

  const data = {
    code: (str(formData, "code") ?? "").toUpperCase(),
    name: str(formData, "name") ?? "",
    fundClass: (str(formData, "fundClass") ?? "UNRESTRICTED") as never,
    description: str(formData, "description"),
    openingBalance: num(formData, "openingBalance"),
    is18aEligible: formData.get("is18aEligible") === "on",
    isActive: formData.get("isActive") !== null,
  };

  if (!data.code || !data.name) throw new Error("Code and name are required.");

  if (id) await db.fund.update({ where: { id }, data });
  else await db.fund.create({ data: { ...data, openingDate: new Date() } });

  revalidatePath("/funds");
  redirect("/funds");
}

export async function transferBetweenFunds(formData: FormData) {
  await requireArea("finance", true);

  const amount = num(formData, "amount");
  const fromFundId = str(formData, "fromFundId")!;
  const toFundId = str(formData, "toFundId")!;

  if (amount <= 0) throw new Error("Amount must be greater than zero.");
  if (fromFundId === toFundId) throw new Error("Choose two different funds.");

  await db.fundTransfer.create({
    data: {
      date: dt(formData, "date"),
      amount,
      reason: str(formData, "reason") ?? "Fund transfer",
      fromFundId,
      toFundId,
    },
  });

  revalidatePath("/funds");
  revalidatePath("/");
  redirect("/funds");
}

/* ── chart of accounts ───────────────────────────────────────────── */

export async function saveAccount(id: string | null, formData: FormData) {
  await requireArea("finance", true);

  const data = {
    code: str(formData, "code") ?? "",
    name: str(formData, "name") ?? "",
    type: (str(formData, "type") ?? "EXPENSE") as never,
    notes: str(formData, "notes"),
    isActive: formData.get("isActive") !== null,
  };

  if (!data.code || !data.name) throw new Error("Code and name are required.");

  if (id) await db.account.update({ where: { id }, data });
  else await db.account.create({ data });

  revalidatePath("/accounts");
  redirect("/accounts");
}
