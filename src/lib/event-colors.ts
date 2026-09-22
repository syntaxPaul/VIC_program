/**
 * Category colours for the planner.
 *
 * This lives outside the calendar component on purpose. The calendar is a
 * client component, and a plain object exported from a "use client" module
 * arrives in a server component as a client reference, not as the object —
 * every lookup silently returns undefined. That is how the year planner
 * first printed as an empty grid.
 *
 * The hues are spaced in lightness as well as hue so the printed sheet still
 * reads when the church office prints it in black and white. No two
 * categories share a value — baptism and outreach did, which made them the
 * same block on the wall chart.
 */
export const CATEGORY_COLOR: Record<string, string> = {
  SERVICE: "#7A5C2E",
  MEETING: "#4A6FA5",
  OUTREACH: "#2F6F6B",
  FUNDRAISING: "#B4642E",
  CONFERENCE: "#6B4A7A",
  BAPTISM: "#93342E",
  YOUTH: "#8C5A3C",
  WOMEN: "#A03C6B",
  MEN: "#3C5A8C",
  CHILDREN: "#5F7A4A",
  OTHER: "#6F6558",
};

export function eventColor(category: string) {
  return CATEGORY_COLOR[category] ?? CATEGORY_COLOR.OTHER;
}
