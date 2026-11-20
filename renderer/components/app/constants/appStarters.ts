import type { AppStarter } from "@/components/app/types/appStarters.types";

/** The welcome previews and composer suggestions share the same descriptions for starting a real app. */
export const APP_STARTERS: readonly AppStarter[] = [
  {
    id: "customers", label: "Customer overview", icon: "users", description: "Your contacts, pipeline and invoices in one place.",
    text: "A customer overview: my CRM contacts in a table with company, stage and value, a metric of total pipeline value, the open and overdue invoices as a bar chart, and a form to create a support ticket for a contact.",
    preview: {
      prompt: "Bring my contacts, pipeline and open invoices into one dashboard.", sources: ["CRM", "Invoicing"],
      metrics: [{ label: "Pipeline value", value: "£42,800", note: "Across 12 opportunities" }, { label: "Open invoices", value: "8", note: "2 need a follow-up" }],
      chartTitle: "Pipeline this week", bars: [28, 42, 36, 62, 48, 76, 68, 92], listTitle: "Your customers",
      rows: [{ title: "Acme Studio", detail: "Design & creative", value: "£12,400" }, { title: "Northstar", detail: "Software", value: "£8,600" }, { title: "Good Things Co.", detail: "Retail", value: "£6,200" }]
    }
  },
  {
    id: "inbox", label: "Inbox triage", icon: "inbox", description: "Find what needs a reply and clear the rest.",
    text: "An inbox triage board: unread emails from the last two days as a list with sender and subject, a count of messages waiting, and a button to archive the selected message.",
    preview: {
      prompt: "Show the emails that need me, with a way to archive the rest.", sources: ["Email"],
      metrics: [{ label: "Waiting for you", value: "12", note: "From the last two days" }, { label: "Cleared today", value: "28", note: "A little more headspace" }],
      chartTitle: "Messages cleared this week", bars: [38, 64, 48, 84, 72, 58, 88, 96], listTitle: "Needs a reply",
      rows: [{ title: "Alex Morgan", detail: "A quick question about Friday", value: "9:41" }, { title: "The design team", detail: "Your feedback on the new look", value: "9:12" }, { title: "Jamie Chen", detail: "Shall we get this booked in?", value: "8:56" }]
    }
  },
  {
    id: "sprint", label: "Sprint board", icon: "kanban", description: "See what’s moving, what’s blocked and what’s next.",
    text: "A sprint dashboard: open issues grouped by status in a table, a metric of issues closed this week, a chart of issues per assignee, and a form to create an issue with a title and description.",
    preview: {
      prompt: "Make a sprint dashboard with open issues and this week’s progress.", sources: ["Issue tracker"],
      metrics: [{ label: "Completed this week", value: "24", note: "One step closer to shipping" }, { label: "In progress", value: "7", note: "Across your team" }],
      chartTitle: "Issues completed this week", bars: [24, 46, 38, 64, 58, 78, 86, 96], listTitle: "In progress",
      rows: [{ title: "Polish the onboarding", detail: "Product · NORA-128", value: "In review" }, { title: "Ship the new dashboard", detail: "Engineering · NORA-132", value: "Building" }, { title: "Update the help centre", detail: "Support · NORA-135", value: "Writing" }]
    }
  }
];
