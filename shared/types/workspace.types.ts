import type { AgentDetectionInfo } from "./session.types";
import type { TerminalPreset } from "./system.types";

export interface WorkspaceTaskSummary {
  path: string;
  title: string;
  updatedAt: string | null;
  completed: boolean;
}

export interface WorkspaceSpecSummary {
  path: string;
  title: string;
  updatedAt: string | null;
}

export interface WorkspaceNoteSummary {
  path: string;
  title: string;
  updatedAt: string | null;
}

/**
 * Context bundles stored under Nora's app data for a worktree
 * (`~/.nora/projects/.../sessions/.../worktrees/.../context-bundle-*.md`), detectable for import into the checkout.
 */
export interface NoraDetectableContextBundleSummary {
  bundleId: string;
  fileName: string;
  sizeBytes: number;
  updatedAt: string | null;
  /** Lowercase hex MD5 of full file bytes; null if hashing failed. */
  contentMd5: string | null;
  displayTarget: string | null;
  handoffCreatedAt: string | null;
  displaySources: string | null;
  primarySourceAgentLabel: string | null;
  extraSourceAgentCount: number;
  approxEstimatedTokens: number | null;
}

/** Files under `.nora/imported_context/` created when handing off shared agent context. */
export interface ImportedContextBundleSummary {
  path: string;
  fileName: string;
  sizeBytes: number;
  updatedAt: string | null;
  /** Lowercase hex MD5 of full file bytes; null if hashing failed. */
  contentMd5: string | null;
  /** From bundle markdown `Target agent:` when parsing succeeds. */
  displayTarget: string | null;
  /** From bundle markdown `Generated:` (ISO string) when parsing succeeds. */
  handoffCreatedAt: string | null;
  /** Comma-separated `## Source (tool)` lines from the bundle, when parsing succeeds. */
  displaySources: string | null;
  /** First contributing agent (`##` section) when parsing succeeds. */
  primarySourceAgentLabel: string | null;
  /** How many additional `##` sources exist after {@link primarySourceAgentLabel}. */
  extraSourceAgentCount: number;
  /**
   * Rough token count (character length ÷ 4) when the full file is read; otherwise a coarse estimate from byte size.
   * Same heuristic as other context size estimates in the app.
   */
  approxEstimatedTokens: number | null;
}

export interface WorkspaceTaskBoardSection {
  id: string;
  title: string;
}

export interface WorkspaceTaskBoardTaskPosition {
  sectionId: string;
  order: number;
}

export interface WorkspaceTaskAssignment {
  agentId: string;
  sessionId: string;
  agentName: string;
  toolId: string;
  toolLabel: string;
  assignedAt: string;
}

export interface WorkspaceTaskBoard {
  version: 1;
  sections: WorkspaceTaskBoardSection[];
  taskPositions: Record<string, WorkspaceTaskBoardTaskPosition>;
  taskAssignments: Record<string, WorkspaceTaskAssignment[]>;
}

export const DEFAULT_WORKSPACE_TASK_BOARD_SECTIONS: WorkspaceTaskBoardSection[] = [
  { id: "todo", title: "Todo" },
  { id: "in-progress", title: "In Progress" },
  { id: "done", title: "Done" }
];

export function createDefaultWorkspaceTaskBoard(): WorkspaceTaskBoard {
  return {
    version: 1,
    sections: DEFAULT_WORKSPACE_TASK_BOARD_SECTIONS.map((section) => ({ ...section })),
    taskPositions: {},
    taskAssignments: {}
  };
}

export type WorkspaceSplitViewItemReference =
  | {
      kind: "agent";
      agentId: string;
      sessionId: string;
    }
  | {
      kind: "terminal";
      terminalId: string;
      sessionId: string;
    };

export interface WorkspaceSplitViewTile {
  id: string;
  item: WorkspaceSplitViewItemReference;
  column: number;
  row: number;
  width: number;
  height: number;
}

export interface WorkspaceSplitView {
  id: string;
  name: string;
  gridColumns: 1 | 2 | 3 | 4;
  gridRows: 1 | 2;
  tiles: WorkspaceSplitViewTile[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSplitViewCollection {
  version: 1;
  views: WorkspaceSplitView[];
}

export function createDefaultWorkspaceSplitViewCollection(): WorkspaceSplitViewCollection {
  return {
    version: 1,
    views: []
  };
}

export type WorkspaceLocation =
  | { kind: "local" }
  | {
      kind: "ssh";
      host: string;
      user: string;
      port: number | null;
      remotePath: string;
      alias?: string | null;
    };

export interface WorkspaceFramework {
  id: string;
  label: string;
  logoUrl: string;
  version: string | null;
}

export interface WorkspaceInstructionFile {
  kind: "agents";
  fileName: string;
  relativePath: string;
  absolutePath: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  rootPath: string;
  gitCommonDir: string;
  location?: WorkspaceLocation;
  remoteAgentCatalog?: AgentDetectionInfo[] | null;
  workspaceInstructionFile?: WorkspaceInstructionFile | null;
  workspaceTerminalPresets?: TerminalPreset[];
  baseBranch: string;
  framework: WorkspaceFramework | null;
  platform: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
}

export interface WorkspaceFileRequest {
  projectId: string;
  path: string;
  rootPath?: string;
}

export interface CreateWorkspaceDirectoryPayload extends WorkspaceFileRequest {}

export interface WriteWorkspaceFilePayload extends WorkspaceFileRequest {
  content: string;
}

export interface ImportBrowserImagePayload {
  projectId: string;
  rootPath?: string;
  directoryPath: string;
  sourceUrl?: string;
  data?: Uint8Array;
  mimeType?: string;
  suggestedFileName?: string;
}

export interface WorkspaceSearchRequest {
  projectId: string;
  query: string;
  rootPath?: string;
  caseSensitive?: boolean;
}

export interface WorkspaceSearchResult {
  path: string;
  lineNumber: number | null;
  lineText: string | null;
  matchCount: number;
}

export interface WorkspacePathStatResult {
  exists: boolean;
  kind: "file" | "directory" | null;
}

export interface WorkspaceGitStatusSummary {
  branch: string | null;
  lines: string[];
  truncated: boolean;
}
