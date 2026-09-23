/**
 * South African identity numbers.
 *
 *   YYMMDD SSSS C A Z
 *   │      │    │   └ check digit (Luhn)
 *   │      │    └ 0 citizen, 1 permanent resident
 *   │      └ 0000–4999 female, 5000–9999 male
 *   └ date of birth
 *
 * Used to fill in the date of birth and gender as the number is typed, and
 * to tell somebody their number has a typo before it reaches the register.
 * Pure functions, so the same code runs in the browser and on the server.
 */

export type SaIdResult =
  | { valid: true; dob: Date; dobIso: string; gender: "MALE" | "FEMALE"; citizen: boolean }
  | { valid: false; reason: string };

function luhnValid(digits: string) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export function parseSaId(raw: string, today = new Date()): SaIdResult {
  const id = raw.replace(/\s+/g, "");
  if (!/^\d{13}$/.test(id)) {
    return { valid: false, reason: "An ID number is 13 digits." };
  }

  const yy = Number(id.slice(0, 2));
  const mm = Number(id.slice(2, 4));
  const dd = Number(id.slice(4, 6));

  // Two-digit years: anything later than this year belongs to the last century.
  const thisYY = today.getFullYear() % 100;
  const year = yy > thisYY ? 1900 + yy : 2000 + yy;

  const dob = new Date(year, mm - 1, dd);
  if (
    mm < 1 || mm > 12 ||
    dob.getFullYear() !== year || dob.getMonth() !== mm - 1 || dob.getDate() !== dd
  ) {
    return { valid: false, reason: "The first six digits are not a real date of birth." };
  }
  if (dob > today) {
    return { valid: false, reason: "That date of birth is in the future." };
  }

  const citizenship = Number(id[10]);
  if (citizenship > 1) {
    return { valid: false, reason: "The eleventh digit should be 0 or 1." };
  }

  if (!luhnValid(id)) {
    return { valid: false, reason: "That number does not check out — a digit may be mistyped." };
  }

  const dobIso = `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  return {
    valid: true,
    dob,
    dobIso,
    gender: Number(id.slice(6, 10)) >= 5000 ? "MALE" : "FEMALE",
    citizen: citizenship === 0,
  };
}
