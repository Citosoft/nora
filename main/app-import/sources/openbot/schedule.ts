import { routineScheduleSchema } from "@shared/bots/routines/contracts";
import type { RoutineSchedule } from "@shared/types/bots/routines.types";

const CRON = /^\S+\s+\S+\s+\S+\s+\S+\s+\S+$/;

function parsed(value: string): unknown {
  try { return JSON.parse(value); } catch { return value; }
}

function fromValue(value: unknown): RoutineSchedule | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (CRON.test(trimmed)) return { kind: "custom", expression: trimmed };
    return trimmed.startsWith("{") ? fromValue(parsed(trimmed)) : null;
  }
  if (!value || typeof value !== "object") return null;
  const nora = routineScheduleSchema.safeParse(value);
  if (nora.success) return nora.data;
  for (const key of ["cron", "expression", "cronExpression", "cron_expression"] as const) {
    const candidate = (value as Record<string, unknown>)[key];
    if (typeof candidate === "string" && CRON.test(candidate.trim())) return { kind: "custom", expression: candidate.trim() };
  }
  return null;
}

/**
 * OpenBot's schedule columns change between versions, so this accepts what a schedule commonly looks like: a
 * five-field cron string, an object carrying one, or a schedule already in Nora's shape. Anything else is reported.
 */
export function openBotSchedule(values: readonly unknown[]): RoutineSchedule | null {
  for (const value of values) {
    const schedule = fromValue(value);
    if (schedule) return schedule;
  }
  return null;
}
