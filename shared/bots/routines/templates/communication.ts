import type { RoutineTemplate } from "@shared/types/bots/routines.types";

export const COMMUNICATION_ROUTINES: readonly RoutineTemplate[] = [
  { id: "content-review", name: "Content review", summary: "Drafts, editorial gaps and upcoming content priorities.", runIn: "chat",
    schedule: {"kind": "weekly", "weekday": 1, "time": "10:00"},
    instruction: "Review available drafts, content plans and campaign briefs. Identify unclear messaging, unsupported claims, stale content and gaps against audience goals. Suggest concrete edits and the next editorial priorities. Keep the author's voice and source evidence; do not edit source documents or publish anything." },
  { id: "knowledge-review", name: "Knowledge review", summary: "Stale guidance, contradictory sources and documentation gaps.", runIn: "chat",
    schedule: {"kind": "weekly", "weekday": 1, "time": "11:00"},
    instruction: "Review the available documents and reference notes relevant to this workspace. Identify stale guidance, contradictions, missing evidence and hard-to-find information, with source links and proposed updates. Separate authoritative information from assumptions. Do not merge, delete or edit documents." },
  { id: "meeting-followups", name: "Meeting follow-ups", summary: "Decisions, outstanding actions and questions from recent meetings.", runIn: "chat",
    schedule: {"kind": "weekdays", "time": "16:00"},
    instruction: "Review available recent meeting notes and transcripts. Summarise decisions, outstanding actions with recorded owners and dates, and unresolved questions. Flag overdue follow-ups without inventing commitments. Do not change calendars, assign tasks or send messages." },
  { id: "daily-agenda", name: "Daily agenda", summary: "Today’s priorities, upcoming meetings and outstanding follow-ups.", runIn: "chat",
    schedule: {"kind": "weekdays", "time": "08:30"},
    instruction: "Prepare a concise agenda from the available calendar, tasks and notes: upcoming meetings, preparation needed, overdue follow-ups and the three most useful priorities today. Use recorded times and commitments, note missing context and flag conflicts. Do not modify calendars, tasks or send messages." },
  { id: "learning-review", name: "Learning progress review", summary: "Practice completed, remaining gaps and the next useful exercises.", runIn: "chat",
    schedule: {"kind": "weekly", "weekday": 5, "time": "16:00"},
    instruction: "Review the available learning goals, practice notes and completed exercises. Distinguish demonstrated understanding from topics merely covered, summarise remaining gaps, and suggest two or three concrete practice tasks for next week. Do not invent progress or change the learner’s goals." },
];
