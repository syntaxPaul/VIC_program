export const OUTREACH_KINDS = [
  ["STREET_EVANGELISM", "Street evangelism"],
  ["DOOR_TO_DOOR", "Door to door"],
  ["OPEN_AIR_CRUSADE", "Open-air crusade"],
  ["REVIVAL", "Revival meetings"],
  ["HOSPITAL_VISIT", "Hospital visit"],
  ["PRISON_VISIT", "Prison visit"],
  ["OLD_AGE_HOME", "Old-age home"],
  ["SCHOOL_OUTREACH", "School outreach"],
  ["COMMUNITY_SERVICE", "Community service"],
  ["FOOD_DISTRIBUTION", "Food distribution"],
  ["FOLLOW_UP_VISITS", "Follow-up visits"],
  ["OTHER", "Other"],
] as const;

export function outreachKindLabel(k: string) {
  return OUTREACH_KINDS.find(([v]) => v === k)?.[1] ?? k;
}
