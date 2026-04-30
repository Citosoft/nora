export type AgentContextPrecision = "exact" | "parsed" | "derived";

export type AgentContextEntryKind =
  | "launch"
  | "user-prompt"
  | "workspace-paths"
  | "context-bundle"
  | "agent-output";

export type AgentPromptSource =
  | "dialog"
  | "composer"
  | "task-panel"
  | "task-reference"
  | "task-planner"
  | "forge-issue"
  | "browser-selection"
  | "file-editor";

export type AgentContextReferenceKind =
  | "agent"
  | "workspace-path"
  | "bundle-file";

export interface AgentContextReference {
  kind: AgentContextReferenceKind;
  label: string;
  value: string;
}

export interface AgentContextEstimate {
  characters: number;
  estimatedTokens: number;
}

export interface AgentContextEntry {
  id: string;
  agentId: string;
  projectId: string;
  sessionId: string;
  worktreeId: string;
  createdAt: string;
  kind: AgentContextEntryKind;
  precision: AgentContextPrecision;
  source: AgentPromptSource | "harness";
  title: string;
  content: string;
  preview: string;
  estimate: AgentContextEstimate;
  conversationId?: string;
  references: AgentContextReference[];
  sourceAgentIds: string[];
}

export interface AgentContextSelection {
  sourceAgentId: string;
  entryIds: string[];
}

export interface AgentContextEntryGroup {
  id: string;
  title: string;
  latestPreview: string;
  lastUpdatedAt: string | null;
  entryCount: number;
  estimate: AgentContextEstimate;
  entryIds: string[];
}

export interface AgentPromptAttachment {
  path: string;
  kind: "file" | "directory";
}

export interface AgentPromptSubmission {
  source: AgentPromptSource;
  title?: string | null;
  text: string;
  workspacePaths: AgentPromptAttachment[];
  contextSelections: AgentContextSelection[];
  references?: AgentContextReference[];
}

export interface AgentContextState {
  agentId: string;
  agentName: string;
  toolLabel: string;
  contextFilePath: string;
  contextEventsPath: string;
  terminalStreamPath: string;
  estimate: AgentContextEstimate;
  entries: AgentContextEntry[];
}

export interface AgentContextSourceSummary {
  agentId: string;
  agentName: string;
  toolLabel: string;
  contextFilePath: string;
  contextEventsPath: string;
  terminalStreamPath: string;
  entryCount: number;
  lastUpdatedAt: string | null;
  latestPreview: string;
  estimate: AgentContextEstimate;
  entryGroups: AgentContextEntryGroup[];
}

export interface AgentPromptDispatchResult {
  agentId: string;
  bundleFilePath: string | null;
  compiledPrompt: string;
  estimate: AgentContextEstimate;
}
