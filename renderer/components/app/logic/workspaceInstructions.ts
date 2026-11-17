import type { InstructionDocument, InstructionsReader, InstructionsWorkspace } from "@/components/app/types/workspaceInstructions.types";

const INSTRUCTION_FILE_NAMES = [
  ["AGENTS.md", "AGENTS.MD", "agents.md"],
  ["CLAUDE.md", "CLAUDE.MD", "claude.md"]
];

/** Probe directly so ignored instruction files are visible too. Prefer one spelling per file on case-insensitive disks. */
export async function readWorkspaceInstructions(reader: InstructionsReader, workspace: InstructionsWorkspace): Promise<InstructionDocument[]> {
  const documents = await Promise.all(INSTRUCTION_FILE_NAMES.map(async (names): Promise<InstructionDocument | null> => {
    let path = names[0];
    try {
      for (path of names) {
        const request = { ...workspace, path };
        const stat = await reader.statWorkspacePath(request);
        if (stat.exists && stat.kind === "file") {
          return { path, status: "ready", content: await reader.readWorkspaceFile(request) };
        }
      }
      return null;
    } catch (error: unknown) {
      return { path, status: "error", message: error instanceof Error ? error.message : "Unable to read workspace instructions." };
    }
  }));
  return documents.filter((document): document is InstructionDocument => document !== null);
}
