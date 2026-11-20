import type { RoutineTemplate } from "@shared/types/bots/routines.types";

export const BUSINESS_ROUTINES: readonly RoutineTemplate[] = [
  { id: "support-triage", name: "Support triage", summary: "Unresolved customer issues, recurring themes and escalation needs.", runIn: "chat",
    schedule: {"kind": "weekdays", "time": "09:00"},
    instruction: "Review the available support queue. Summarise unresolved and overdue conversations, group recurring issues, and identify items needing escalation with supporting links. Draft suggested replies where useful. Do not send replies, close tickets or promise refunds or delivery dates." },
  { id: "customer-health", name: "Customer health review", summary: "Onboarding blockers, adoption risks and useful follow-ups.", runIn: "chat",
    schedule: {"kind": "weekly", "weekday": 1, "time": "10:00"},
    instruction: "Review available customer account and support context. Identify onboarding blockers, adoption risks and outstanding commitments, separating observed signals from assumptions. Suggest account-specific next actions and draft follow-ups without contacting customers or updating records." },
  { id: "sales-followups", name: "Sales follow-ups", summary: "Open opportunities and follow-ups that need attention.", runIn: "chat",
    schedule: {"kind": "weekdays", "time": "09:00"},
    instruction: "Review available opportunities and customer correspondence. List overdue follow-ups, stalled deals and missing discovery information. Draft relevant next steps or messages using verified product capabilities. Do not send outreach, modify deals, offer discounts or invent customer commitments." },
  { id: "finance-review", name: "Finance review", summary: "A weekly look at revenue, costs, overdue invoices and variances.", runIn: "chat",
    schedule: {"kind": "weekly", "weekday": 5, "time": "09:00"},
    instruction: "Review the supplied or connected financial records. Reconcile relevant totals, state currencies and periods, and summarise overdue invoices, material variances and cash-flow questions. Separate actuals from estimates and identify missing data. Do not move money, alter invoices or contact customers." },
  { id: "hiring-pipeline", name: "Hiring pipeline review", summary: "Outstanding interview feedback, stalled stages and coordination gaps.", runIn: "chat",
    schedule: {"kind": "weekdays", "time": "10:00"},
    instruction: "Review the supplied hiring pipeline and interview notes. Identify overdue feedback, stalled stages and scheduling or evaluation gaps using recorded job-related criteria. Summarise next coordination steps without inferring protected characteristics, ranking candidates or making hiring decisions. Do not contact candidates or alter records." },
];
