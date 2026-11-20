import type { RoutineTemplate } from "@shared/types/bots/routines.types";

export const PRODUCT_ROUTINES: readonly RoutineTemplate[] = [
  { id: "delivery-status", name: "Delivery status", summary: "Milestone progress, blocked work and decisions needed.", runIn: "chat",
    schedule: {"kind": "weekdays", "time": "09:00"},
    instruction: "Review the available task and project sources. Summarise milestone progress, blocked work, dependencies and decisions needed, identifying owners and dates only when recorded. Flag unclear requirements and acceptance criteria. Do not move tasks, change commitments or send updates." },
  { id: "feedback-digest", name: "User feedback digest", summary: "A weekly synthesis of customer needs and product friction.", runIn: "chat",
    schedule: {"kind": "weekly", "weekday": 2, "time": "10:00"},
    instruction: "Review recent user feedback, support conversations and research notes that are available. Group themes with source evidence, separate individual reports from wider patterns, and identify unmet needs, usability problems and questions to research next. Protect participant privacy; do not contact customers or modify records." },
  { id: "design-review", name: "Design review", summary: "Usability and accessibility findings from recent design work.", runIn: "chat",
    schedule: {"kind": "weekly", "weekday": 3, "time": "11:00"},
    instruction: "Review recent designs or documented product flows available in this workspace. Identify usability, hierarchy, accessibility and missing-state issues, explain their user impact, and suggest concrete alternatives with source references. State what you could not inspect. Do not change designs or publish comments." },
  { id: "experiment-review", name: "Experiment review", summary: "Metric quality, experiment progress and unanswered questions.", runIn: "chat",
    schedule: {"kind": "weekly", "weekday": 5, "time": "10:00"},
    instruction: "Review the available experiments and analysis. Check hypothesis and metric definitions, data quality, guardrails and decision criteria. Summarise results with uncertainty and sample limitations, separate correlation from causation, and recommend the next analysis or decision. Do not change experiments or data." },
];
