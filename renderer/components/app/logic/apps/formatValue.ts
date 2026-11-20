import type { AppValueFormat } from "@shared/types/apps/apps.types";
import type { JsonValue } from "@main/jsonValue";
import type { AppRow } from "@/components/app/types/apps.types";

const RELATIVE_UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [["year", 31_536_000], ["month", 2_592_000], ["week", 604_800], ["day", 86_400], ["hour", 3_600], ["minute", 60]];

const toNumber = (value: JsonValue | undefined): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
  return null;
};
const toDate = (value: JsonValue | undefined): Date | null => {
  if (typeof value === "number") return new Date(value > 1e12 ? value : value * 1000);
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** "2 minutes ago", "in 3 days": the nearest unit, in the user's locale. */
export function relative(date: Date, now: number): string {
  const seconds = Math.round((date.getTime() - now) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, size] of RELATIVE_UNITS) if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  return formatter.format(seconds, "second");
}

/** Shows one cell or metric value the way the agent asked, falling back to the plain text when the value does not fit the format. */
export function formatAppValue(value: JsonValue | undefined, format: AppValueFormat = "text", currency = "USD", now = Date.now()): string {
  if (value === undefined || value === null || value === "") return "";
  switch (format) {
    case "number": { const number = toNumber(value); return number === null ? String(value) : number.toLocaleString(); }
    case "currency": {
      const number = toNumber(value);
      if (number === null) return String(value);
      try { return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(number); } catch { return number.toLocaleString(); }
    }
    case "percent": { const number = toNumber(value); return number === null ? String(value) : `${(Math.abs(number) <= 1 ? number * 100 : number).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`; }
    case "date": { const date = toDate(value); return date ? date.toLocaleDateString() : String(value); }
    case "datetime": { const date = toDate(value); return date ? date.toLocaleString() : String(value); }
    case "relative": { const date = toDate(value); return date ? relative(date, now) : String(value); }
    case "text": return typeof value === "object" ? JSON.stringify(value) : String(value);
  }
}

export const isNumericFormat = (format: AppValueFormat | undefined): boolean => format === "number" || format === "currency" || format === "percent";

/** Rows a data component can show: only objects count, so a source that returned scalars renders empty rather than breaking. */
export function appRows(value: unknown): AppRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is AppRow => !!entry && typeof entry === "object" && !Array.isArray(entry));
}

export const cellValue = (row: AppRow, key: string): JsonValue | undefined => row[key];
