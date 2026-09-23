"use server";

import { requireArea } from "@/lib/guards";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { DonorNature } from "@/generated/prisma";

function str(fd: FormData, k: string) {
  const v = fd.get(k);
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}
function num(fd: FormData, k: string) {
  const s = str(fd, k);
  if (!s) return 0;
  const n = parseFloat(s.replace(/[\s ]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Sequential within the financial year, and never reused. */
async function nextReceiptNumber() {
  const year = new Date().getFullYear();
  const count = await db.receipt18A.count({
    where: { receiptNumber: { startsWith: `18A-${year}-` } },
  });
  return `18A-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function issue18aReceipt(formData: FormData) {
  const session = await requireArea("finance", true);

  const settings = await db.settings.findFirst();
  if (!settings?.is18aApproved) {
    throw new Error(
      "This church is not recorded as Section 18A approved. Enable it in Settings first, and only if SARS has actually granted approval.",
    );
  }

  const fundId = str(formData, "fundId");
  if (!fundId) throw new Error("A fund is required.");

  const fund = await db.fund.findUniqueOrThrow({ where: { id: fundId } });
  if (!fund.is18aEligible) {
    throw new Error(
      `"${fund.name}" is not flagged as Section 18A eligible. Ordinary tithes and general offerings are not deductible under Section 18A.`,
    );
  }

  const isInKind = formData.get("isInKind") === "on";
  const amount = isInKind ? num(formData, "inKindFairValue") : num(formData, "amount");
  if (amount <= 0) throw new Error("The donation amount must be greater than zero.");

  const donorName = str(formData, "donorName");
  if (!donorName) throw new Error("The donor's name is required.");

  if (isInKind && !str(formData, "inKindDescription")) {
    throw new Error(
      "A donation in kind requires a description of the property donated.",
    );
  }

  const receipt = await db.receipt18A.create({
    data: {
      receiptNumber: await nextReceiptNumber(),
      issuedBy: session.name,
      memberId: str(formData, "memberId"),
      donorName,
      donorNature: (str(formData, "donorNature") ?? "NATURAL_PERSON") as DonorNature,
      donorIdType: str(formData, "donorIdType"),
      donorIdCountry: str(formData, "donorIdCountry") ?? "South Africa",
      donorIdNumber: str(formData, "donorIdNumber"),
      donorTaxRef: str(formData, "donorTaxRef"),
      donorAddress: str(formData, "donorAddress"),
      donorPhone: str(formData, "donorPhone"),
      donorEmail: str(formData, "donorEmail"),
      donorTradingName: str(formData, "donorTradingName"),
      donationDate: str(formData, "donationDate")
        ? new Date(str(formData, "donationDate")!)
        : new Date(),
      amount,
      isInKind,
      inKindDescription: str(formData, "inKindDescription"),
      inKindFairValue: isInKind ? num(formData, "inKindFairValue") : null,
      fundId,
    },
  });

  await db.auditLog.create({
    data: {
      userId: session.id,
      action: "CREATE",
      entity: "Receipt18A",
      entityId: receipt.id,
      summary: `Issued 18A receipt ${receipt.receiptNumber} to ${donorName}`,
    },
  });

  revalidatePath("/receipts");
  redirect(`/receipts/${receipt.id}`);
}

/** Receipts are never deleted — a cancelled one stays in the register. */
export async function cancelReceipt(id: string, formData: FormData) {
  const session = await requireArea("finance", true);

  const reason = str(formData, "cancelledReason");
  if (!reason) throw new Error("A reason is required to cancel a receipt.");

  await db.receipt18A.update({
    where: { id },
    data: { cancelled: true, cancelledReason: reason },
  });

  await db.auditLog.create({
    data: {
      userId: session.id,
      action: "UPDATE",
      entity: "Receipt18A",
      entityId: id,
      summary: `Cancelled 18A receipt — ${reason}`,
    },
  });

  revalidatePath("/receipts");
  redirect(`/receipts/${id}`);
}
