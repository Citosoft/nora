import type { LoopRun, TerminalSession } from "@shared/appTypes";
import type { ThreadNavigationRow } from "@/components/app/types/thread-workspace/ports.types";

export function workspaceActivity(projectId: string, nativeWorkspaceId: string | undefined, threads: readonly Pick<ThreadNavigationRow, "workspaceId" | "attention" | "active">[], terminals: readonly Pick<TerminalSession, "isBusy" | "status">[], runs: readonly Pick<LoopRun, "projectId" | "status">[]) {
  const workspaceThreads = nativeWorkspaceId ? threads.filter((row) => row.workspaceId === nativeWorkspaceId) : [];
  const workflows = runs.filter((run) => run.projectId === projectId);
  return {
    attention: workspaceThreads.filter((row) => row.attention).length + workflows.filter((run) => run.status === "paused").length,
    running: workspaceThreads.filter((row) => row.active).length
      + terminals.filter((terminal) => terminal.status === "running" && terminal.isBusy).length
      + workflows.filter((run) => run.status === "preparing" || run.status === "running" || run.status === "pausing").length
  };
}
