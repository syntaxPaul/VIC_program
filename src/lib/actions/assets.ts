"use server";

import { requireArea } from "@/lib/guards";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { savePhoto, deletePhoto } from "@/lib/uploads";
import type { AssetCategory, AssetCondition, DisposalMethod, VerificationOutcome } from "@/generated/prisma";

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
function dt(fd: FormData, k: string) {
  const s = str(fd, k);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function nextAssetCode() {
  const last = await db.asset.findFirst({
    orderBy: { assetCode: "desc" },
    select: { assetCode: true },
  });
  const n = last ? parseInt(last.assetCode.replace(/\D/g, ""), 10) + 1 : 1;
  return `VIC-${String(n).padStart(4, "0")}`;
}

export async function saveAsset(id: string | null, formData: FormData) {
  const session = await requireArea("assets", true);

  const data = {
    description: str(formData, "description") ?? "",
    makeModel: str(formData, "makeModel"),
    serialNumber: str(formData, "serialNumber"),
    category: (str(formData, "category") ?? "OTHER") as AssetCategory,
    acquisitionDate: dt(formData, "acquisitionDate") ?? new Date(),
    acquisitionCost: num(formData, "acquisitionCost"),
    acquisitionMethod: (str(formData, "acquisitionMethod") ?? "PURCHASED") as never,
    supplier: str(formData, "supplier"),
    invoiceRef: str(formData, "invoiceRef"),
    donorName: str(formData, "donorName"),
    location: str(formData, "location"),
    custodianId: str(formData, "custodianId"),
    ministry: str(formData, "ministry"),
    usefulLifeYears: Math.max(1, Math.round(num(formData, "usefulLifeYears")) || 5),
    residualValue: num(formData, "residualValue"),
    insuredValue: num(formData, "insuredValue") || null,
    insurancePolicyRef: str(formData, "insurancePolicyRef"),
    warrantyExpiry: dt(formData, "warrantyExpiry"),
    condition: (str(formData, "condition") ?? "GOOD") as AssetCondition,
    status: (str(formData, "status") ?? "IN_USE") as never,
    fundId: str(formData, "fundId"),
  };

  if (!data.description) throw new Error("A description is required.");

  const photo = formData.get("photo");
  const newPhoto = photo instanceof File ? await savePhoto(photo) : null;

  if (id && newPhoto) {
    const prev = await db.asset.findUnique({
      where: { id },
      select: { photoPath: true },
    });
    await deletePhoto(prev?.photoPath);
  }

  const asset = id
    ? await db.asset.update({
        where: { id },
        data: newPhoto ? { ...data, photoPath: newPhoto } : data,
      })
    : await db.asset.create({
        data: { ...data, photoPath: newPhoto, assetCode: await nextAssetCode() },
      });

  await db.auditLog.create({
    data: {
      userId: session.id,
      action: id ? "UPDATE" : "CREATE",
      entity: "Asset",
      entityId: asset.id,
      summary: `${id ? "Updated" : "Added"} asset ${asset.assetCode} — ${asset.description}`,
    },
  });

  revalidatePath("/assets");
  redirect(`/assets/${asset.id}`);
}

/**
 * A write-off is never a delete. The row stays visible in the
 * "Disposed & written off" view with its approval reference.
 */
export async function writeOffAsset(id: string, formData: FormData) {
  const session = await requireArea("assets", true);

  const approvalReference = str(formData, "approvalReference");
  if (!approvalReference) {
    throw new Error("A council resolution or minute reference is required to write off an asset.");
  }

  const method = (str(formData, "disposalMethod") ?? "SCRAPPED") as DisposalMethod;

  const asset = await db.asset.update({
    where: { id },
    data: {
      status: method === "SOLD" ? "DISPOSED" : "WRITTEN_OFF",
      disposalDate: dt(formData, "disposalDate") ?? new Date(),
      disposalMethod: method,
      disposalProceeds: num(formData, "disposalProceeds"),
      approvalReference,
      approvedBy: str(formData, "approvedBy"),
      disposalNotes: str(formData, "disposalNotes"),
      condition: "UNSERVICEABLE",
    },
  });

  await db.auditLog.create({
    data: {
      userId: session.id,
      action: "APPROVE",
      entity: "Asset",
      entityId: id,
      summary: `Wrote off ${asset.assetCode} — ${approvalReference}`,
    },
  });

  revalidatePath("/assets");
  redirect(`/assets/${id}`);
}

/* ── stocktake ───────────────────────────────────────────────────── */

export async function createStocktake(formData: FormData) {
  await requireArea("assets", true);

  const st = await db.stocktake.create({
    data: {
      name: str(formData, "name") ?? `${new Date().getFullYear()} Stocktake`,
      cutoffDate: dt(formData, "cutoffDate") ?? new Date(),
      scopeNote: str(formData, "scopeNote"),
      status: "OPEN",
    },
  });

  revalidatePath("/stocktake");
  redirect(`/stocktake/${st.id}`);
}

export async function recordVerification(stocktakeId: string, formData: FormData) {
  const session = await requireArea("assets", true);

  const assetId = str(formData, "assetId")!;
  const outcome = (str(formData, "outcome") ?? "FOUND") as VerificationOutcome;
  const condition = str(formData, "condition") as AssetCondition | null;
  const foundLocation = str(formData, "foundLocation");

  await db.verification.upsert({
    where: { stocktakeId_assetId: { stocktakeId, assetId } },
    create: {
      stocktakeId, assetId, outcome, condition, foundLocation,
      notes: str(formData, "notes"),
      verifiedById: session.id,
    },
    update: {
      outcome, condition, foundLocation,
      notes: str(formData, "notes"),
      verifiedById: session.id,
      verifiedAt: new Date(),
    },
  });

  // stamp the asset with its verification, and apply a move
  await db.asset.update({
    where: { id: assetId },
    data: {
      lastVerifiedAt: new Date(),
      lastVerifiedBy: session.name,
      ...(condition ? { condition } : {}),
      ...(outcome === "MOVED" && foundLocation ? { location: foundLocation } : {}),
    },
  });

  await db.stocktake.update({
    where: { id: stocktakeId },
    data: { status: "IN_PROGRESS" },
  });

  revalidatePath(`/stocktake/${stocktakeId}`);
}

export async function closeStocktake(id: string) {
  const session = await requireArea("assets", true);

  await db.stocktake.update({
    where: { id },
    data: { status: "CLOSED", closedAt: new Date() },
  });

  await db.auditLog.create({
    data: {
      userId: session.id,
      action: "APPROVE",
      entity: "Stocktake",
      entityId: id,
      summary: "Closed stocktake round",
    },
  });

  revalidatePath("/stocktake");
  redirect(`/stocktake/${id}`);
}
