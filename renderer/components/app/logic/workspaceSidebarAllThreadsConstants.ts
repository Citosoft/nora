import type { AllThreadsGroupBy } from "@/components/app/types/workspaceSidebarAllThreads.types";

export const WORKSPACE_SIDEBAR_ALL_THREADS_GROUP_BY_OPTIONS: readonly { value: AllThreadsGroupBy; label: string }[] = [
  { value: "none", label: "None" },
  { value: "workspace", label: "Project" },
  { value: "harness", label: "Harness" }
];

export const WORKSPACE_SIDEBAR_ALL_THREADS_VISIBLE_LIMIT = 5;

export const WORKSPACE_SIDEBAR_ALL_THREADS_GROUP_BY_CYCLE: AllThreadsGroupBy[] =
  WORKSPACE_SIDEBAR_ALL_THREADS_GROUP_BY_OPTIONS.map((option) => option.value);
