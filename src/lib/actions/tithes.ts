"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireArea } from "@/lib/guards";
import { dateTime, money, text } from "@/lib/calendar-link";
import { GIVING_TYPES } from "@/lib/giving";
import type { PayMethod } from "@/generated/prisma";

/**
 * Record one person's tithe or offering.
 *
 * It lands in that day's open batch — created if there is none — so it still
 * goes through a second counter and posting like any other money the church
 * receives. The treasurer gets a quick way in without a way around the
 * controls.
 */
export async function recordGiving(formData: FormData) {
  const session = await requireArea("tithes", true);

  const date = dateTime(formData, "date");
  const amount = money(formData, "amount");
  const type = GIVING_TYPES.find((g) => g.key === text(formData, "type"));
  if (!date || !amount || amount <= 0 || !type) {
    throw new Error("Give the date, the kind of giving and an amount above zero.");
  }

  const [account, fund] = await Promise.all([
    db.account.findUnique({ where: { code: type.account } }),
    db.fund.findUnique({ where: { code: type.fund } }),
  ]);
  if (!account || !fund) throw new Error("The chart of accounts is missing an account for this kind of giving.");

  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

  let batch = await db.batch.findFirst({
    where: { status: "DRAFT", serviceDate: { gte: dayStart, lte: dayEnd } },
    orderBy: { createdAt: "asc" },
  });
  if (!batch) {
    const year = dayStart.getFullYear();
    const count = await db.batch.count({
      where: { serviceDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
    });
    batch = await db.batch.create({
      data: {
        batchNumber: `B${year}-${String(count + 1).padStart(3, "0")}`,
        serviceDate: dayStart,
        serviceName: "Tithes & offerings",
        createdById: session.id,
      },
    });
  }

  await db.contributionLine.create({
    data: {
      batchId: batch.id,
      memberId: text(formData, "memberId"),
      fundId: fund.id,
      accountId: account.id,
      amount,
      method: (text(formData, "method") ?? "CASH") as PayMethod,
      reference: text(formData, "reference"),
    },
  });

  const m = `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, "0")}`;
  revalidatePath("/tithes");
  revalidatePath(`/contributions/${batch.id}`);
  redirect(`/tithes?m=${m}&saved=1`);
}
