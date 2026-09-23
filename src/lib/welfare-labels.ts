export const WELFARE_KINDS = [
  ["FOOD_PARCEL", "Food parcel"],
  ["CLOTHING", "Clothing"],
  ["SCHOOL_UNIFORM", "School uniform"],
  ["BLANKETS", "Blankets"],
  ["TOILETRIES", "Toiletries"],
  ["CASH_SUPPORT", "Cash support"],
  ["FUNERAL_SUPPORT", "Funeral support"],
  ["MEDICAL", "Medical"],
  ["OTHER", "Other"],
] as const;

export function welfareKindLabel(k: string) {
  return WELFARE_KINDS.find(([v]) => v === k)?.[1] ?? k;
}
