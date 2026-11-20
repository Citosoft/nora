import type { ThreadInsightsSectionDefinition } from "@/components/app/types/threadInsights.types";

/** Menu order matches the order the sections render in the panel. */
export const THREAD_INSIGHTS_SECTIONS: readonly ThreadInsightsSectionDefinition[] = [
  { id: "overview", label: "Overview" },
  { id: "ide", label: "Open in IDE" },
  { id: "subagents", label: "Subagents" },
  { id: "changes", label: "Reviewed changes" },
  { id: "outputs", label: "Outputs" },
  { id: "branch", label: "Branch changes" },
  { id: "connectors", label: "Connectors" },
  { id: "nora-connectors", label: "Nora connectors" },
  { id: "skills", label: "Skills" }
];
