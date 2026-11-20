import type { RoutineTemplate } from "@shared/types/bots/routines.types";

/**
 * Starting points for common routines. Choosing one prefills the editor, so the bot, workspace, wording and time stay the user's.
 * Intervals are left out: their anchor is the moment the routine is saved.
 */
export const CORE_ROUTINES: readonly RoutineTemplate[] = [
  { id: "morning-briefing", name: "Morning briefing", summary: "What changed overnight and what needs you today.", runIn: "chat",
    schedule: { kind: "weekdays", time: "08:30" },
    instruction: "Give me a short morning briefing for this workspace: what changed since yesterday (commits, merged and open pull requests, new tasks), "
      + "anything blocked or failing, and the three things most worth my attention today. Keep it under 200 words." },
  { id: "open-review-sweep", name: "Pull request sweep", summary: "Open pull requests that are stale, blocked or waiting on review.", runIn: "chat",
    schedule: { kind: "weekdays", time: "14:00" },
    instruction: "List the open pull requests in this repository. Flag ones with no review for over two days, failing checks or merge conflicts, "
      + "and say who or what each one is waiting on. Don't change anything." },
  { id: "weekly-summary", name: "Weekly summary", summary: "A Friday wrap-up of what shipped and what slipped.", runIn: "thread",
    schedule: { kind: "weekly", weekday: 5, time: "16:00" },
    instruction: "Write a weekly summary for this workspace: what shipped this week, what is in progress, what slipped and why, and the plan for next "
      + "week. Group it by Features, Fixes and Improvements where that fits." },
  { id: "dependency-check", name: "Dependency check", summary: "Outdated or vulnerable dependencies, once a week.", runIn: "thread",
    schedule: { kind: "weekly", weekday: 1, time: "10:00" },
    instruction: "Check this project's dependencies for available updates and known security advisories. Report major, minor and patch updates "
      + "separately, with any breaking changes worth knowing. Don't install or change anything." },
  { id: "task-board-tidy", name: "Task board tidy-up", summary: "Spots stale, duplicate or unclear tasks.", runIn: "chat",
    schedule: { kind: "weekly", weekday: 1, time: "09:00" },
    instruction: "Review the task board for this workspace. Point out tasks that look stale, duplicated, already done or too vague to start, "
      + "and suggest what to do with each. Ask before moving or changing any task." },
  { id: "monthly-retro", name: "Monthly retrospective", summary: "What went well, what didn't and what to try next month.", runIn: "thread",
    schedule: { kind: "monthly", day: 1, time: "10:00" },
    instruction: "Look back over the last month of work in this workspace and write a short retrospective: what went well, what was harder than "
      + "expected, recurring problems, and two or three concrete things to try next month." },
  { id: "follow-up-reminder", name: "One-off follow-up", summary: "Check back on something once, at a set time.", runIn: "chat",
    schedule: { kind: "once", date: "2026-01-01", time: "09:00" },
    instruction: "Check whether the thing we discussed has been done, tell me where it stands, and suggest the next step." }
];
