import type { AppRow } from "./apps.types";
/** A cell the user can edit in place; `onCommit` receives the typed text, which the Table turns into the row's field value. */
export interface AppEditableCellProps { text: string; numeric: boolean; onCommit(value: string): void; }
/** The ranges a DateRange input offers; "custom" shows two date fields instead. */
export type AppDateRangePreset = "today" | "last7" | "last30" | "thisMonth" | "lastMonth" | "custom";
/** One cell of a month grid. */
export interface CalendarDay { key: string; day: number; inMonth: boolean; today: boolean; rows: AppRow[]; }
export interface CalendarMonth { label: string; weeks: CalendarDay[][]; }
/** Rows on screen out of a longer list, and how many wait behind Show more. */
export interface ShownRows { rows: readonly AppRow[]; hidden: number; showMore(): void; }
