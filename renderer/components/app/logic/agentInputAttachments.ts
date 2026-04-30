import type { PastedImageDraft, WorkspacePathAttachmentDraft } from "@/components/app/types/agentInput.types";
import {
  isAbsoluteFilesystemPath,
  joinWorkspaceRootAndRelative
} from "@shared/workspaceAbsolutePath";

export function formatWorkspacePathForSubmission(
  draft: WorkspacePathAttachmentDraft,
  absoluteWorkspaceRoot: string | null
): string {
  if (isAbsoluteFilesystemPath(draft.path)) {
    return draft.path;
  }
  const root = absoluteWorkspaceRoot?.trim() ?? "";
  if (!root) {
    return draft.path;
  }
  return joinWorkspaceRootAndRelative(root, draft.path);
}

export function buildAgentInputBodyText(
  value: string,
  pastedImages: PastedImageDraft[]
): string {
  const trimmedValue = value.trim();
  const blocks: string[] = [];

  if (pastedImages.length > 0) {
    const lines = pastedImages.map((draft) => `- ${draft.path}`);
    blocks.push(`Attached pasted image files:\n${lines.join("\n")}`);
  }

  if (!trimmedValue && blocks.length === 0) {
    return "";
  }
  if (!trimmedValue) {
    return blocks.join("\n\n");
  }
  if (blocks.length === 0) {
    return trimmedValue;
  }
  return `${trimmedValue}\n\n${blocks.join("\n\n")}`;
}

export function buildAgentInputPayload(
  value: string,
  pastedImages: PastedImageDraft[],
  workspacePaths: WorkspacePathAttachmentDraft[],
  absoluteWorkspaceRoot: string | null
): string {
  const bodyText = buildAgentInputBodyText(value, pastedImages);
  if (workspacePaths.length > 0) {
    const lines = workspacePaths.map(
      (draft) => `- ${formatWorkspacePathForSubmission(draft, absoluteWorkspaceRoot)}`
    );
    const workspaceBlock = `Attached workspace paths:\n${lines.join("\n")}`;
    return bodyText ? `${bodyText}\n\n${workspaceBlock}` : workspaceBlock;
  }

  return bodyText;
}

export function buildPlainTerminalInputWithWorkspacePaths(
  value: string,
  workspacePaths: WorkspacePathAttachmentDraft[],
  absoluteWorkspaceRoot: string | null
): string {
  const trimmed = value.trim();
  if (workspacePaths.length === 0) {
    return trimmed;
  }
  const lines = workspacePaths.map(
    (draft) => `- ${formatWorkspacePathForSubmission(draft, absoluteWorkspaceRoot)}`
  );
  const block = `Attached workspace paths:\n${lines.join("\n")}`;
  return trimmed ? `${trimmed}\n\n${block}` : block;
}

export function getPastedImageLabel(draft: PastedImageDraft, index: number): string {
  const fileName = draft.path.split(/[\\/]/).pop() || "";
  return fileName || `Pasted image ${index + 1}`;
}

export function getWorkspacePathPillLabel(draft: WorkspacePathAttachmentDraft): string {
  const raw = draft.path;
  const segments = raw.replace(/[/\\]$/, "").split(/[/\\]/).filter(Boolean);
  const base = segments[segments.length - 1] || raw;
  return draft.kind === "directory" ? `${base}/` : base;
}
