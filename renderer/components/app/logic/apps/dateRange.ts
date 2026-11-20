import type { AppDateRangePreset } from "@/components/app/types/appsComponents.types";

export const DATE_RANGE_PRESETS: readonly { id: AppDateRangePreset; label: string }[] = [
  { id: "today", label: "Today" }, { id: "last7", label: "Last 7 days" }, { id: "last30", label: "Last 30 days" },
  { id: "thisMonth", label: "This month" }, { id: "lastMonth", label: "Last month" }, { id: "custom", label: "Custom" }
];

const day = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const daysAgo = (now: Date, days: number): Date => new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);

/** The local calendar dates a preset covers on a given day; "custom" leaves the dates to the user. */
export function dateRangeFor(preset: AppDateRangePreset, now = new Date()): { from: string; to: string } | null {
  switch (preset) {
    case "today": return { from: day(now), to: day(now) };
    case "last7": return { from: day(daysAgo(now, 6)), to: day(now) };
    case "last30": return { from: day(daysAgo(now, 29)), to: day(now) };
    case "thisMonth": return { from: day(new Date(now.getFullYear(), now.getMonth(), 1)), to: day(now) };
    case "lastMonth": return { from: day(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: day(new Date(now.getFullYear(), now.getMonth(), 0)) };
    case "custom": return null;
  }
}

export const isDateRangePreset = (value: unknown): value is AppDateRangePreset => DATE_RANGE_PRESETS.some((preset) => preset.id === value);
