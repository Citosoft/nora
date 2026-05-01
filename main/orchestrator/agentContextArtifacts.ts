import type {
  AgentContextEntry,
  AgentContextEntryGroup,
  AgentPromptSource,
  AgentContextSelection,
  AgentContextSourceSummary,
  AgentContextState,
  CreateAgentPayload,
  AgentPromptSubmission,
  AgentSession
} from "@shared/appTypes";
import { NORA_IMPORTED_CONTEXT_RELATIVE } from "@shared/constants/noraImportedContext";
import fs from "node:fs/promises";
import path from "node:path";

const CONTEXT_EVENTS_EXTENSION = ".jsonl";

function safePreview(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 200);
}

const AGENT_PROMPT_SOURCES: readonly AgentPromptSource[] = [
  "dialog",
  "composer",
  "task-panel",
  "task-reference",
  "task-planner",
  "forge-issue",
  "browser-selection",
  "file-editor"
];

function normalizeStoredContextSource(
  value: unknown,
  kind: AgentContextEntry["kind"]
): AgentContextEntry["source"] {
  if (typeof value === "string" && AGENT_PROMPT_SOURCES.includes(value as AgentPromptSource)) {
    return value as AgentPromptSource;
  }

  if (value === "harness" || value === "transcript") {
    return "harness";
  }

  return kind === "agent-output" ? "harness" : "dialog";
}

export function estimateContextSize(characters: number): {
  characters: number;
  estimatedTokens: number;
} {
  const safeCharacters = Math.max(0, characters);
  return {
    characters: safeCharacters,
    estimatedTokens: Math.ceil(safeCharacters / 4)
  };
}

export function buildAgentContextEventsPath(contextFilePath: string): string {
  return contextFilePath.replace(/\.md$/i, CONTEXT_EVENTS_EXTENSION);
}

export function buildAgentContextBundlePath(contextFilePath: string, bundleId: string): string {
  return path.join(path.dirname(contextFilePath), `context-bundle-${bundleId}.md`);
}

function formatMarkdownEntry(entry: AgentContextEntry): string {
  const lines = [
    `[${entry.createdAt}] ${entry.title}`,
    `kind: ${entry.kind} • precision: ${entry.precision} • source: ${entry.source}`
  ];

  if (entry.references.length > 0) {
    lines.push(...entry.references.map((reference) => `${reference.label}: ${reference.value}`));
  }

  lines.push("", entry.content, "");
  return `${lines.join("\n")}\n`;
}

export function formatAgentContextEntriesMarkdown(entries: readonly AgentContextEntry[]): string {
  if (entries.length === 0) {
    return "";
  }

  return `${entries.map((entry) => formatMarkdownEntry(entry)).join("\n")}`.trimEnd() + "\n";
}

export async function ensureAgentContextArtifacts(agent: AgentSession): Promise<void> {
  const contextEventsPath = buildAgentContextEventsPath(agent.contextFilePath);
  await Promise.all([
    fs.mkdir(path.dirname(agent.contextFilePath), { recursive: true }),
    fs.mkdir(path.dirname(agent.terminalStreamPath), { recursive: true })
  ]);
  await Promise.all([
    fs.writeFile(agent.terminalStreamPath, agent.rawTerminalOutput, "utf8"),
    fs.writeFile(agent.contextFilePath, "", { encoding: "utf8", flag: "a" }),
    fs.writeFile(contextEventsPath, "", { encoding: "utf8", flag: "a" })
  ]);
}

export async function readAgentContextEntries(contextFilePath: string): Promise<AgentContextEntry[]> {
  const contextEventsPath = buildAgentContextEventsPath(contextFilePath);
  try {
    const raw = await fs.readFile(contextEventsPath, "utf8");
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => {
        try {
          const parsed = JSON.parse(line) as Partial<AgentContextEntry> & { content?: string; preview?: string };
          const content = typeof parsed.content === "string" ? parsed.content : "";
          const kind = parsed.kind || "agent-output";
          return [{
            id: parsed.id || `legacy-${Date.now()}`,
            agentId: parsed.agentId || "",
            projectId: parsed.projectId || "",
            sessionId: parsed.sessionId || "",
            worktreeId: parsed.worktreeId || "",
            createdAt: parsed.createdAt || new Date().toISOString(),
            kind,
            precision: parsed.precision || "parsed",
            source: normalizeStoredContextSource(parsed.source, kind),
            title: parsed.title || "Tracked context",
            content,
            preview: typeof parsed.preview === "string" && parsed.preview.length > 0 ? parsed.preview : safePreview(content),
            estimate: parsed.estimate || estimateContextSize(content.length),
            conversationId: typeof parsed.conversationId === "string" && parsed.conversationId.trim().length > 0
              ? parsed.conversationId
              : undefined,
            references: Array.isArray(parsed.references) ? parsed.references : [],
            sourceAgentIds: Array.isArray(parsed.sourceAgentIds) ? parsed.sourceAgentIds : []
          }];
        } catch {
          return [];
        }
      });
  } catch {
    return [];
  }
}

export async function appendAgentContextEntries(contextFilePath: string, entries: AgentContextEntry[]): Promise<void> {
  if (!entries.length) {
    return;
  }

  const contextEventsPath = buildAgentContextEventsPath(contextFilePath);
  await fs.mkdir(path.dirname(contextFilePath), { recursive: true });
  await Promise.all([
    fs.appendFile(contextFilePath, entries.map((entry) => formatMarkdownEntry(entry)).join("\n"), "utf8"),
    fs.appendFile(contextEventsPath, `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`, "utf8")
  ]);
}

export async function clearAgentContextArtifacts(agent: AgentSession): Promise<void> {
  const contextEventsPath = buildAgentContextEventsPath(agent.contextFilePath);
  await Promise.all([
    fs.mkdir(path.dirname(agent.contextFilePath), { recursive: true }),
    fs.mkdir(path.dirname(agent.terminalStreamPath), { recursive: true })
  ]);
  await Promise.all([
    fs.writeFile(agent.contextFilePath, "", "utf8"),
    fs.writeFile(contextEventsPath, "", "utf8"),
    fs.writeFile(agent.terminalStreamPath, "", "utf8")
  ]);
}

export async function writeAgentContextBundle(
  contextFilePath: string,
  bundleId: string,
  content: string
): Promise<string> {
  const bundleFilePath = buildAgentContextBundlePath(contextFilePath, bundleId);
  await fs.mkdir(path.dirname(bundleFilePath), { recursive: true });
  await fs.writeFile(bundleFilePath, content, "utf8");
  return bundleFilePath;
}

const NORA_IMPORTED_CONTEXT_GITIGNORE_LINE = "imported_context/";

export function buildImportedContextBundlePath(workspaceRoot: string, bundleId: string): string {
  return path.join(workspaceRoot, ...NORA_IMPORTED_CONTEXT_RELATIVE.split("/"), `context-bundle-${bundleId}.md`);
}

export async function ensureNoraImportedContextGitignore(workspaceRoot: string): Promise<void> {
  const noraDir = path.join(workspaceRoot, ".nora");
  const gitignorePath = path.join(noraDir, ".gitignore");
  await fs.mkdir(noraDir, { recursive: true });
  let existing = "";
  try {
    existing = await fs.readFile(gitignorePath, "utf8");
  } catch {
    existing = "";
  }
  const hasRule = existing.split(/\r?\n/).some((line) => {
    const t = line.trim();
    return (
      t === NORA_IMPORTED_CONTEXT_GITIGNORE_LINE ||
      t === "/imported_context/" ||
      t === ".nora/imported_context/" ||
      t === "/.nora/imported_context/"
    );
  });
  if (hasRule) {
    return;
  }
  const base = existing.replace(/\s*$/, "");
  const next = base.length > 0 ? `${base}\n${NORA_IMPORTED_CONTEXT_GITIGNORE_LINE}\n` : `${NORA_IMPORTED_CONTEXT_GITIGNORE_LINE}\n`;
  await fs.writeFile(gitignorePath, next, "utf8");
}

/**
 * Copies a bundle from Nora's worktree metadata dir into the agent checkout so CLIs can read it.
 * Skips when the workspace path is missing, uses "~", or copy fails (e.g. SSH-only path on host).
 */
export async function importAgentContextBundleIntoWorkspace(
  workspaceRoot: string,
  bundleId: string,
  sourceBundlePath: string
): Promise<string | null> {
  const trimmed = workspaceRoot.trim();
  if (!trimmed || trimmed.startsWith("~")) {
    return null;
  }
  const resolvedRoot = path.resolve(trimmed);
  try {
    await ensureNoraImportedContextGitignore(resolvedRoot);
    const dest = buildImportedContextBundlePath(resolvedRoot, bundleId);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(sourceBundlePath, dest);
    return dest;
  } catch {
    return null;
  }
}

export function buildContextBundleMarkdown(options: {
  bundleId: string;
  createdAt: string;
  targetAgent: Pick<AgentSession, "id" | "name" | "toolLabel">;
  sources: Array<{
    agentId: string;
    agentName: string;
    toolLabel: string;
    entries: AgentContextEntry[];
  }>;
}): string {
  const sections = [
    "# Nora Agent Context Bundle",
    "",
    `Bundle ID: ${options.bundleId}`,
    `Generated: ${options.createdAt}`,
    `Target agent: ${options.targetAgent.name} (${options.targetAgent.toolLabel})`,
    "",
    "Harness conversation entries were read from each agent CLI's own session files; exact entries were captured directly by Nora.",
    ""
  ];

  for (const source of options.sources) {
    sections.push(`## ${source.agentName} (${source.toolLabel})`, "");
    for (const entry of source.entries) {
      sections.push(
        `### ${entry.title}`,
        `- Created: ${entry.createdAt}`,
        `- Precision: ${entry.precision}`,
        `- Kind: ${entry.kind}`,
        ""
      );
      if (entry.references.length > 0) {
        sections.push(...entry.references.map((reference) => `- ${reference.label}: ${reference.value}`), "");
      }
      sections.push(entry.content, "");
    }
  }

  return sections.join("\n").trimEnd() + "\n";
}

export function buildPromptText(
  submission: AgentPromptSubmission,
  bundleFilePath: string | null
): string {
  const trimmedText = submission.text.trim();
  const blocks: string[] = [];

  if (trimmedText) {
    blocks.push(trimmedText);
  }

  if (bundleFilePath) {
    blocks.push(`Shared agent context bundle:\n- ${bundleFilePath}`);
  }

  if (submission.workspacePaths.length > 0) {
    blocks.push(
      `Attached workspace paths:\n${submission.workspacePaths.map((entry) => `- ${entry.path}`).join("\n")}`
    );
  }

  if (blocks.length === 0) {
    return bundleFilePath ? `Shared agent context bundle:\n- ${bundleFilePath}` : "";
  }

  return blocks.join("\n\n");
}

export function buildLaunchContextEntry(options: {
  agent: AgentSession;
  createdAt: string;
  payload: CreateAgentPayload;
}): AgentContextEntry {
  const targetLabel = options.payload.target.kind === "existing"
    ? `Existing worktree ${options.payload.target.worktreeId}`
    : options.payload.target.kind === "new"
      ? "New managed worktree"
      : options.payload.target.kind === "root"
        ? "Workspace root"
        : "Session default target";
  const content = [
    `Agent: ${options.agent.name}`,
    `Tool: ${options.agent.toolLabel}`,
    `Mode: ${options.agent.mode}`,
    `Launch target: ${targetLabel}`,
    `Task: ${options.agent.task}`,
    `Command: ${options.agent.command}`
  ].join("\n");

  return {
    id: `${options.agent.id}-launch-${Date.parse(options.createdAt)}`,
    agentId: options.agent.id,
    projectId: options.agent.projectId,
    sessionId: options.agent.sessionId,
    worktreeId: options.agent.worktreeId,
    createdAt: options.createdAt,
    kind: "launch",
    precision: "exact",
    source: options.payload.launchSource || "dialog",
    title: "Agent launch details",
    content,
    preview: safePreview(content),
    estimate: buildEntryEstimate(content),
    references: [
      {
        kind: "workspace-path",
        label: "Workspace",
        value: options.agent.workspace
      }
    ],
    sourceAgentIds: []
  };
}

function buildEntryEstimate(content: string): {
  characters: number;
  estimatedTokens: number;
} {
  return estimateContextSize(content.length);
}

export function buildPromptContextEntries(options: {
  agent: AgentSession;
  submission: AgentPromptSubmission;
  createdAt: string;
  bundleFilePath: string | null;
  sourceEntries: Array<{
    agentId: string;
    agentName: string;
    toolLabel: string;
    entries: AgentContextEntry[];
  }>;
}): AgentContextEntry[] {
  const entries: AgentContextEntry[] = [];

  if (options.submission.text.trim()) {
    entries.push({
      id: `${options.agent.id}-prompt-${Date.parse(options.createdAt)}`,
      agentId: options.agent.id,
      projectId: options.agent.projectId,
      sessionId: options.agent.sessionId,
      worktreeId: options.agent.worktreeId,
      createdAt: options.createdAt,
      kind: "user-prompt",
      precision: "exact",
      source: options.submission.source,
      title: options.submission.title?.trim() || "Prompt sent to agent",
      content: options.submission.text.trim(),
      preview: safePreview(options.submission.text),
      estimate: buildEntryEstimate(options.submission.text.trim()),
      references: options.submission.references ?? [],
      sourceAgentIds: []
    });
  }

  if (options.submission.workspacePaths.length > 0) {
    entries.push({
      id: `${options.agent.id}-paths-${Date.parse(options.createdAt)}`,
      agentId: options.agent.id,
      projectId: options.agent.projectId,
      sessionId: options.agent.sessionId,
      worktreeId: options.agent.worktreeId,
      createdAt: options.createdAt,
      kind: "workspace-paths",
      precision: "exact",
      source: options.submission.source,
      title: "Workspace paths attached",
      content: options.submission.workspacePaths.map((entry) => `${entry.kind}: ${entry.path}`).join("\n"),
      preview: `${options.submission.workspacePaths.length} workspace path${options.submission.workspacePaths.length === 1 ? "" : "s"} attached`,
      estimate: buildEntryEstimate(options.submission.workspacePaths.map((entry) => `${entry.kind}: ${entry.path}`).join("\n")),
      references: options.submission.workspacePaths.map((entry) => ({
        kind: "workspace-path",
        label: entry.kind === "directory" ? "Directory" : "File",
        value: entry.path
      })),
      sourceAgentIds: []
    });
  }

  if (options.bundleFilePath && options.sourceEntries.length > 0) {
    const sourceNames = options.sourceEntries.map((entry) => entry.agentName);
    entries.push({
      id: `${options.agent.id}-bundle-${Date.parse(options.createdAt)}`,
      agentId: options.agent.id,
      projectId: options.agent.projectId,
      sessionId: options.agent.sessionId,
      worktreeId: options.agent.worktreeId,
      createdAt: options.createdAt,
      kind: "context-bundle",
      precision: "exact",
      source: options.submission.source,
      title: "Shared agent context bundle attached",
      content: [
        `Bundle file: ${options.bundleFilePath}`,
        `Sources: ${sourceNames.join(", ")}`
      ].join("\n"),
      preview: `Shared ${options.sourceEntries.reduce((total, entry) => total + entry.entries.length, 0)} context entr${options.sourceEntries.length === 1 ? "y" : "ies"} from ${sourceNames.join(", ")}`,
      estimate: buildEntryEstimate([
        `Bundle file: ${options.bundleFilePath}`,
        `Sources: ${sourceNames.join(", ")}`
      ].join("\n")),
      references: [
        { kind: "bundle-file", label: "Bundle file", value: options.bundleFilePath },
        ...options.sourceEntries.map((entry) => ({
          kind: "agent" as const,
          label: `Source agent: ${entry.agentName}`,
          value: entry.agentId
        }))
      ],
      sourceAgentIds: options.sourceEntries.map((entry) => entry.agentId)
    });
  }

  return entries;
}

export function buildAgentContextState(agent: AgentSession, entries: AgentContextEntry[]): AgentContextState {
  const estimate = estimateContextSize(entries.reduce((total, entry) => total + entry.estimate.characters, 0));
  return {
    agentId: agent.id,
    agentName: agent.name,
    toolLabel: agent.toolLabel,
    contextFilePath: agent.contextFilePath,
    contextEventsPath: buildAgentContextEventsPath(agent.contextFilePath),
    terminalStreamPath: agent.terminalStreamPath,
    estimate,
    entries
  };
}

function formatConversationLabel(toolLabel: string, rawSessionId: string | null): string {
  if (!rawSessionId) {
    return `${toolLabel} session`;
  }

  const compactId = rawSessionId.length > 18 ? `${rawSessionId.slice(0, 18)}...` : rawSessionId;
  return `${toolLabel} session ${compactId}`;
}

function assignContextEntryGroupIds(agent: AgentSession, entries: AgentContextEntry[]): string[] {
  const harnessAnchors = entries
    .map((entry, index) => {
      const harnessConversationId = entry.conversationId || null;
      if (!harnessConversationId) {
        return null;
      }

      return {
        index,
        groupId: `${agent.toolId}:${harnessConversationId}`,
        timestampMs: Date.parse(entry.createdAt)
      };
    })
    .flatMap((anchor) => (anchor ? [anchor] : []));

  const fallbackGroupId = `${agent.toolId}:${agent.resumeSessionId || agent.sessionId}`;

  return entries.map((entry) => {
    const directConversationId = entry.conversationId || null;
    if (directConversationId) {
      return `${agent.toolId}:${directConversationId}`;
    }

    const entryTimestampMs = Date.parse(entry.createdAt);
    if (!Number.isFinite(entryTimestampMs) || harnessAnchors.length === 0) {
      return fallbackGroupId;
    }

    const nearestAnchor = harnessAnchors
      .map((anchor) => ({
        groupId: anchor.groupId,
        distanceMs: Math.abs(anchor.timestampMs - entryTimestampMs)
      }))
      .sort((left, right) => left.distanceMs - right.distanceMs)[0];

    return nearestAnchor?.groupId || fallbackGroupId;
  });
}

function buildAgentContextEntryGroups(agent: AgentSession, entries: AgentContextEntry[]): AgentContextEntryGroup[] {
  const groupedEntries = new Map<string, AgentContextEntry[]>();
  const groupOrder: string[] = [];

  assignContextEntryGroupIds(agent, entries).forEach((groupId, index) => {
    if (!groupedEntries.has(groupId)) {
      groupedEntries.set(groupId, []);
      groupOrder.push(groupId);
    }

    groupedEntries.get(groupId)?.push(entries[index] as AgentContextEntry);
  });

  return groupOrder
    .map((groupId) => {
      const groupEntries = groupedEntries.get(groupId) || [];
      const lastEntry = groupEntries[groupEntries.length - 1] || null;
      const rawConversationId = groupId.includes(":") ? groupId.split(":").slice(1).join(":") : null;
      const characters = groupEntries.reduce((total, entry) => total + entry.estimate.characters, 0);

      return {
        id: groupId,
        title: formatConversationLabel(agent.toolLabel, rawConversationId),
        latestPreview: lastEntry?.preview || "",
        lastUpdatedAt: lastEntry?.createdAt || null,
        entryCount: groupEntries.length,
        estimate: estimateContextSize(characters),
        entryIds: groupEntries.map((entry) => entry.id)
      };
    })
    .sort((left, right) => {
      const leftTimestamp = left.lastUpdatedAt ? Date.parse(left.lastUpdatedAt) : 0;
      const rightTimestamp = right.lastUpdatedAt ? Date.parse(right.lastUpdatedAt) : 0;
      return rightTimestamp - leftTimestamp;
    });
}

export function buildAgentContextSourceSummary(agent: AgentSession, entries: AgentContextEntry[]): AgentContextSourceSummary {
  const lastEntry = entries[entries.length - 1] || null;
  const estimate = estimateContextSize(entries.reduce((total, entry) => total + entry.estimate.characters, 0));
  const entryGroups = buildAgentContextEntryGroups(agent, entries).slice(0, 6);

  return {
    agentId: agent.id,
    agentName: agent.name,
    toolId: agent.toolId,
    toolLabel: agent.toolLabel,
    contextFilePath: agent.contextFilePath,
    contextEventsPath: buildAgentContextEventsPath(agent.contextFilePath),
    terminalStreamPath: agent.terminalStreamPath,
    entryCount: entries.length,
    lastUpdatedAt: lastEntry?.createdAt || null,
    latestPreview: lastEntry?.preview || "",
    estimate,
    entryGroups
  };
}

export function resolveSelectedContextEntries(options: {
  selections: AgentContextSelection[];
  agentsById: Map<string, AgentSession>;
  entriesByAgentId: Map<string, AgentContextEntry[]>;
}): Array<{
  agentId: string;
  agentName: string;
  toolLabel: string;
  entries: AgentContextEntry[];
}> {
  const bundles: Array<{
    agentId: string;
    agentName: string;
    toolLabel: string;
    entries: AgentContextEntry[];
  }> = [];

  for (const selection of options.selections) {
    const sourceEntries = options.entriesByAgentId.get(selection.sourceAgentId) || [];
    if (selection.entryIds.length === 0) {
      continue;
    }

    const selectedEntryIdSet = new Set(selection.entryIds);
    const selectedEntries = sourceEntries.filter((entry) => selectedEntryIdSet.has(entry.id));
    if (!selectedEntries.length) {
      continue;
    }

    if (selection.externalHarness) {
      bundles.push({
        agentId: selection.sourceAgentId,
        agentName: selection.externalHarness.sessionLabel,
        toolLabel: selection.externalHarness.toolLabel,
        entries: selectedEntries
      });
      continue;
    }

    const sourceAgent = options.agentsById.get(selection.sourceAgentId);
    if (!sourceAgent) {
      continue;
    }

    bundles.push({
      agentId: sourceAgent.id,
      agentName: sourceAgent.name,
      toolLabel: sourceAgent.toolLabel,
      entries: selectedEntries
    });
  }

  return bundles;
}
