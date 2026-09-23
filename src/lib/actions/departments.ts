"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireArea } from "@/lib/guards";
import { text } from "@/lib/calendar-link";

export async function saveDepartment(id: string | null, formData: FormData) {
  await requireArea("departments", true);
  const name = text(formData, "name");
  const code = text(formData, "code")?.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  if (!name || !code) throw new Error("A department needs a name and a short code.");

  const data = {
    name,
    code,
    description: text(formData, "description"),
    leaderName: text(formData, "leaderName"),
    leaderPhone: text(formData, "leaderPhone"),
    isActive: formData.get("isActive") !== "off",
  };

  if (id) await db.department.update({ where: { id }, data });
  else await db.department.create({ data });

  revalidatePath("/departments");
  revalidatePath("/budgets");
}
