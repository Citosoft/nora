import { claudeDesktopDirectory, readClaudeDesktopSessions } from "./desktopSessions";
import type { ClaudeDesktopSession } from "@main/types/execution/claudeDesktop.types";
import { claudeToolCallSchema, claudeToolResultSchema } from "./toolSchemas";
import { getSessionInfo, getSessionMessages, listSessions } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { SDKSessionInfo, SessionMessage } from "@anthropic-ai/claude-agent-sdk";
import type { ClaudeHistoryApi, ExternalSessionReader, ExternalTranscript, ExternalTurn } from "@main/types/execution/externalSessions.types";
import type { ExternalSession } from "@shared/types/conversation/externalSessions.types";
import type { ToolActivity } from "@shared/types/conversation/contracts.types";
import { isExternalWorkspace } from "../externalWorkspace";
import { formatToolContent, formatToolInput } from "../toolPresentation";
import { ExecutionCommandError } from "@main/execution/errors";

const messageSchema = z.object({ content: z.union([z.string(), z.array(z.json())]) });
const textSchema = z.object({ type: z.literal("text"), text: z.string() });
const thinkingSchema = z.object({ type: z.literal("thinking"), thinking: z.string() });

/** SessionMessage.message is an untyped SDK boundary; narrow every block before projecting it. */
export function normalizeClaudeHistory(session: ExternalSession, messages: readonly SessionMessage[]): ExternalTranscript {
  const turns: ExternalTurn[] = [];
  const tools = new Map<string, ToolActivity>();
  let turn: ExternalTurn | undefined;
  for (const message of messages) {
    if (message.parent_tool_use_id || message.type === "system") continue;
    const parsed = messageSchema.safeParse(message.message);
    if (!parsed.success) continue;
    const blocks = typeof parsed.data.content === "string" ? [{ type: "text", text: parsed.data.content }] : parsed.data.content;
    const text = blocks.flatMap((block) => { const part = textSchema.safeParse(block); return part.success ? [part.data.text] : []; }).join("\n");
    if (message.type === "user" && text.trim()) {
      turn = { id: message.uuid, instruction: text, state: "interrupted", items: [] };
      turns.push(turn);
      turn.items.push({ id: message.uuid, runId: turn.id, createdAt: session.createdAt, kind: "message", role: "user", text, complete: true });
    }
    if (!turn) continue;
    if (message.type === "assistant" && text) {
      turn.items.push({ id: message.uuid, runId: turn.id, createdAt: session.createdAt, kind: "message", role: "assistant", text, complete: true });
      turn.state = "completed";
    }
    for (const [index, block] of blocks.entries()) {
      const identity = { id: `${message.uuid}:${index}`, runId: turn.id, createdAt: session.createdAt };
      const thinking = thinkingSchema.safeParse(block);
      if (thinking.success) turn.items.push({ ...identity, kind: "reasoning", text: thinking.data.thinking, complete: true });
      const call = claudeToolCallSchema.safeParse(block);
      if (call.success) {
        const tool: ToolActivity = { ...identity, id: call.data.id, kind: "tool", label: call.data.name, output: "", state: "unconfirmed",
          details: { category: "other", input: formatToolInput(call.data.input) } };
        tools.set(call.data.id, tool);
        turn.items.push(tool);
        turn.state = "interrupted";
      }
      const result = claudeToolResultSchema.safeParse(block);
      if (result.success) {
        const tool = tools.get(result.data.tool_use_id);
        if (tool) { tool.output = formatToolContent(result.data.content ?? null); tool.state = result.data.is_error ? "failed" : "completed"; }
      }
    }
  }
  return { session, turns };
}

export function createClaudeExternalSessions(instanceId: string, api: ClaudeHistoryApi = { listSessions, getSessionInfo, getSessionMessages }, desktopDirectory = claudeDesktopDirectory()): ExternalSessionReader {
  const summary = (entry: SDKSessionInfo, desktop?: ClaudeDesktopSession): ExternalSession => ({ origin: desktop ? "desktop" : "cli", id: entry.sessionId, providerKind: "claude", instanceId,
    cwd: entry.cwd ?? "", title: desktop?.title?.trim() || entry.customTitle?.trim() || entry.summary.trim() || entry.firstPrompt?.slice(0, 100) || "Claude conversation",
    createdAt: new Date(desktop?.createdAt ?? entry.createdAt ?? entry.lastModified).toISOString(), updatedAt: new Date(Math.max(entry.lastModified, desktop?.lastActivityAt ?? desktop?.lastFocusedAt ?? 0)).toISOString() });
  let listing: Promise<{ entries: SDKSessionInfo[]; desktops: ClaudeDesktopSession[] }> | null = null;
  return {
    async list(workspace) {
      // Global metadata also finds sessions launched from a checkout's subdirectories.
      listing ??= Promise.all([api.listSessions({ includeProgrammatic: false }), readClaudeDesktopSessions(desktopDirectory)])
        .then(([entries, desktops]) => ({ entries, desktops })).finally(() => { listing = null; });
      const { entries, desktops } = await listing;
      const result = new Map<string, ExternalSession>();
      const desktopIds = new Set(desktops.map((desktop) => desktop.cliSessionId));
      for (const entry of entries) if (!desktopIds.has(entry.sessionId) && entry.cwd && await isExternalWorkspace(entry.cwd, workspace.path)) result.set(entry.sessionId, summary(entry));
      for (const desktop of desktops) {
        if (desktop.isArchived || !await isExternalWorkspace(desktop.cwd, workspace.path)) continue;
        const entry = await api.getSessionInfo(desktop.cliSessionId);
        if (entry?.cwd && await isExternalWorkspace(entry.cwd, workspace.path)) result.set(entry.sessionId, summary(entry, desktop));
      }
      return [...result.values()];
    },
    async read(workspace, sessionId) {
      const entry = await api.getSessionInfo(sessionId);
      if (!entry?.cwd || !await isExternalWorkspace(entry.cwd, workspace.path)) {
        throw new ExecutionCommandError("missing", "This Claude conversation is unavailable in this workspace");
      }
      const desktop = (await readClaudeDesktopSessions(desktopDirectory)).find((session) => session.cliSessionId === sessionId);
      if (desktop?.isArchived) throw new ExecutionCommandError("conflict", "This Claude Desktop conversation is archived");
      // Find by native ID after validating cwd; old transcripts may use a symlink alias for their project directory.
      const messages = await api.getSessionMessages(sessionId);
      if (!messages.length) throw new ExecutionCommandError("missing", "The Claude transcript is empty or no longer available");
      return normalizeClaudeHistory(summary(entry, desktop), messages);
    }
  };
}
