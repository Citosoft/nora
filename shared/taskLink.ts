import type { TaskLinkTarget } from "@shared/types/taskLink.types";

/** Links use the owning project and stable id, independent of a thread's checkout or task completion. */
export function buildTaskLink(projectId: string, taskId: string): string {
  return `nora://tasks/open?${new URLSearchParams({ projectId, taskId })}`;
}

export function parseTaskLink(value: string): TaskLinkTarget | null {
  try {
    const url = new URL(value);
    const projectId = url.searchParams.get("projectId");
    const taskId = url.searchParams.get("taskId");
    if (url.protocol !== "nora:" || url.host !== "tasks" || url.pathname !== "/open"
      || url.username || url.password || url.hash || !projectId?.trim() || !taskId?.trim()
      || [...url.searchParams.keys()].length !== 2) return null;
    return { projectId, taskId };
  } catch { return null; }
}

export function taskMarkdownLink(title: string, link: string): string {
  const label = title.replace(/\\/g, "\\\\").replace(/([\[\]`*_<>])/g, "\\$1").replace(/[\r\n]+/g, " ");
  return `[${label}](${link})`;
}
