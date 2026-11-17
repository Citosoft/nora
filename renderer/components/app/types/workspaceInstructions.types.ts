import type { WorkspaceGateway } from "@shared/ipc/types/workspaceGateway.types";

export type InstructionsReader = Pick<WorkspaceGateway, "statWorkspacePath" | "readWorkspaceFile">;
export type InstructionsWorkspace = { projectId: string; rootPath: string };
export type InstructionsContentProps = { workspace: InstructionsWorkspace };
export type InstructionDocument = { path: string } & (
  | { status: "ready"; content: string }
  | { status: "error"; message: string }
);
export type InstructionsState =
  | { status: "loading" }
  | { status: "ready"; documents: InstructionDocument[] };
