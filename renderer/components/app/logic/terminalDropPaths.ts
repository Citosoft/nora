import { workspacePathDraftsFromNativeFileDrop } from "@/components/app/logic/agentInputNativeFileDrop";
import { readWorkspaceRelativePathFromDataTransfer } from "@/components/app/logic/workspacePathDrag";
import {
  isAbsoluteFilesystemPath,
  joinWorkspaceRootAndRelative
} from "@shared/workspaceAbsolutePath";

export function quotePathForShellInsertion(path: string): string {
  if (!/[ \t\n]/.test(path)) {
    return path;
  }
  return `"${path.replace(/"/g, '\\"')}"`;
}

export function getAbsolutePathStringsForTerminalDrop(
  dataTransfer: DataTransfer,
  workspaceRoot: string | null
): string[] {
  const root = workspaceRoot?.trim() ?? "";

  const fromTree = readWorkspaceRelativePathFromDataTransfer(dataTransfer);
  if (fromTree) {
    if (!root) {
      return [fromTree];
    }
    return [joinWorkspaceRootAndRelative(root, fromTree)];
  }

  const drafts = workspacePathDraftsFromNativeFileDrop(dataTransfer, workspaceRoot);
  const strings: string[] = [];
  for (const draft of drafts) {
    if (isAbsoluteFilesystemPath(draft.path)) {
      strings.push(draft.path);
      continue;
    }
    if (root) {
      strings.push(joinWorkspaceRootAndRelative(root, draft.path));
    } else {
      strings.push(draft.path);
    }
  }
  return strings;
}
