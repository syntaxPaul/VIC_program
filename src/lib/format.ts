/**
 * South African formatting conventions.
 * Currency: R1 234 567,89 — space thousands, comma decimal (en-ZA / SI).
 * Negatives in financial statements render in parentheses, per accounting
 * convention, rather than with a minus sign.
 */

const NBSP = " ";

export function formatZAR(
  value: number | null | undefined,
  opts: { decimals?: boolean; parens?: boolean; symbol?: boolean } = {},
): string {
  const { decimals = true, parens = false, symbol = true } = opts;
  const n = value ?? 0;
  const abs = Math.abs(n);

  const parts = abs.toFixed(decimals ? 2 : 0).split(".");
  const whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const body = parts[1] ? `${whole},${parts[1]}` : whole;
  const withSymbol = symbol ? `R${NBSP}${body}` : body;

  if (n < 0) return parens ? `(${withSymbol})` : `-${withSymbol}`;
  return withSymbol;
}

/** Compact form for KPI tiles only — never in financial statements. */
export function formatZARCompact(value: number | null | undefined): string {
  const n = value ?? 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}R${NBSP}${(abs / 1_000_000).toFixed(1).replace(".", ",")}m`;
  if (abs >= 10_000) return `${sign}R${NBSP}${Math.round(abs / 1000)}k`;
  return formatZAR(n, { decimals: abs % 1 !== 0 });
}

export function formatNumber(value: number, decimals = 0): string {
  const parts = value.toFixed(decimals).split(".");
  const whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return parts[1] ? `${whole},${parts[1]}` : whole;
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateLong(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** "14 March 2026" → "fourteenth day of March 2026" for certificates. */
const ORDINALS = [
  "", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth",
  "ninth", "tenth", "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth",
  "sixteenth", "seventeenth", "eighteenth", "nineteenth", "twentieth",
  "twenty-first", "twenty-second", "twenty-third", "twenty-fourth", "twenty-fifth",
  "twenty-sixth", "twenty-seventh", "twenty-eighth", "twenty-ninth", "thirtieth",
  "thirty-first",
];

export function formatDateCeremonial(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  const day = ORDINALS[date.getDate()] ?? `${date.getDate()}th`;
  const month = new Intl.DateTimeFormat("en-ZA", { month: "long" }).format(date);
  return `${day} day of ${month}, ${date.getFullYear()}`;
}

export function formatDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function enumLabel(s: string | null | undefined): string {
  if (!s) return "—";
  return titleCase(s.replace(/_/g, " "));
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function percent(part: number, whole: number): number {
  if (!whole) return 0;
  return (part / whole) * 100;
}
