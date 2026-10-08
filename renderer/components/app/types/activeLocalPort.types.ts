import type { TerminalSession, WorkspaceSummary } from "@shared/appTypes";

/** A local dev server port detected on a running terminal, flattened across all open workspaces. */
export type ActiveLocalPort = {
  projectId: string;
  projectName: string;
  terminalId: string;
  terminalName: string;
  port: number;
  url: string;
};

/** The slice of a workspace summary that port detection reads. */
export type ActiveLocalPortSource = {
  project: Pick<WorkspaceSummary["project"], "id" | "name">;
  terminals: Pick<TerminalSession, "id" | "name" | "status" | "detectedLocalPort" | "detectedLocalUrl">[];
};
