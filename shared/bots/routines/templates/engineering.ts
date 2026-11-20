import type { RoutineTemplate } from "@shared/types/bots/routines.types";

export const ENGINEERING_ROUTINES: readonly RoutineTemplate[] = [
  { id: "code-health-check", name: "Code health check", summary: "A weekly review of recent changes, test gaps and technical risks.", runIn: "chat",
    schedule: {"kind": "weekly", "weekday": 1, "time": "10:00"},
    instruction: "Review recent changes and existing checks in this workspace. Summarise correctness risks, test coverage gaps and recurring maintenance problems, with supporting files or issues and three prioritised next steps. Inspect only; do not change code or create issues." },
  { id: "incident-digest", name: "Error and incident digest", summary: "Recurring errors and the incidents most worth investigating.", runIn: "chat",
    schedule: {"kind": "weekdays", "time": "09:00"},
    instruction: "Review recent errors and incidents from the available sources. Group recurring failures, identify affected users or systems where evidence exists, and prioritise investigations by severity and frequency. Distinguish confirmed causes from hypotheses and link supporting evidence. Do not change systems or send messages." },
  { id: "delivery-health", name: "Delivery health check", summary: "Failing builds, deployment risks and recovery readiness.", runIn: "chat",
    schedule: {"kind": "weekdays", "time": "09:30"},
    instruction: "Review available build, deployment and monitoring information. Report failing checks, recent regressions and release risks with evidence and next actions. Note missing rollback or recovery guidance. Inspect only; do not deploy, restart services or change configuration." },
  { id: "release-readiness", name: "Release readiness", summary: "A weekly assessment of what is ready to ship and what blocks it.", runIn: "chat",
    schedule: {"kind": "weekly", "weekday": 4, "time": "14:00"},
    instruction: "Assess readiness for the next release from recent changes, open issues, checks and changelog entries. List blockers first, distinguish verified results from checks still needed, and draft concise user-facing release notes. Do not publish a release or change tags." },
  { id: "data-quality", name: "Data quality review", summary: "Freshness, schema and quality issues across available datasets.", runIn: "chat",
    schedule: {"kind": "weekly", "weekday": 1, "time": "10:00"},
    instruction: "Review available data pipelines and datasets for freshness, missing or malformed records, schema drift and repeated failures. State the observed evidence, affected consumers and prioritised checks or fixes. Do not change data, restart jobs or run backfills." },
];
