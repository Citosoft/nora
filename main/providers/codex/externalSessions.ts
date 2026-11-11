import { codexSessionOrigin } from "./sessionOrigin";
import { z } from "zod";
import type { ExternalSessionReader, ExternalTurn } from "@main/types/execution/externalSessions.types";
import type { ExternalSession } from "@shared/types/conversation/externalSessions.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { StdioRpc } from "./stdioRpc";
import { isExternalWorkspace } from "../externalWorkspace";
import { normalizeCodexTool } from "./toolActivity";
import { ExecutionCommandError } from "@main/execution/errors";

const metadataSchema = z.object({ id: z.string(), cwd: z.string(), name: z.string().nullable().optional(),
  preview: z.string().optional(), source: z.string().optional(), originator: z.string().nullable().optional(), path: z.string().nullable().optional(), createdAt: z.number(), updatedAt: z.number() });
const listSchema = z.object({ data: z.array(metadataSchema), nextCursor: z.string().nullable() });
const readSchema = z.object({ thread: metadataSchema.extend({ turns: z.array(z.object({
  id: z.string(), status: z.string(), items: z.array(z.json())
})) }) });
const identitySchema = z.object({ id: z.string() });
const itemSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string(), type: z.literal("userMessage"), content: z.array(z.object({ type: z.string(), text: z.string().optional() })) }),
  z.object({ id: z.string(), type: z.literal("agentMessage"), text: z.string() }),
  z.object({ id: z.string(), type: z.literal("reasoning"), summary: z.array(z.string()), content: z.array(z.string()) }),
  z.object({ id: z.string(), type: z.literal("fileChange"), changes: z.array(z.object({ path: z.string(), diff: z.string().optional() })) })
]);

export function createCodexExternalSessions(instanceId: string, connect: () => Promise<StdioRpc>): ExternalSessionReader {
  const session = (entry: z.infer<typeof metadataSchema>, origin: ExternalSession["origin"]): ExternalSession => ({
    origin,
    id: entry.id, providerKind: "codex", instanceId, cwd: entry.cwd,
    title: entry.name?.trim() || entry.preview?.trim().slice(0, 100) || "Codex conversation",
    createdAt: new Date(entry.createdAt * 1000).toISOString(), updatedAt: new Date(entry.updatedAt * 1000).toISOString()
  });
  let listing: Promise<ExternalSession[]> | null = null;
  const listAll = async (): Promise<ExternalSession[]> => {
    const rpc = await connect();
    const sessions: ExternalSession[] = [];
    let cursor: string | null = null;
    const seen = new Set<string>();
    do {
      const page: z.infer<typeof listSchema> = await rpc.request("thread/list", { sourceKinds: ["cli", "appServer", "vscode"], modelProviders: [], archived: false, limit: 100, cursor, sortKey: "updated_at" }, listSchema);
      for (const entry of page.data) {
        const origin = await codexSessionOrigin(entry);
        if (origin) sessions.push(session(entry, origin));
      }
      cursor = page.nextCursor;
      if (cursor && seen.has(cursor)) throw new Error("Codex repeated a session cursor");
      if (cursor) seen.add(cursor);
    } while (cursor);
    return sessions;
  };
  return {
    async list(workspace) {
      // Several workspace views can request the same provider's history at once.
      listing ??= listAll().finally(() => { listing = null; });
      const sessions = await listing;
      const matches = await Promise.all(sessions.map((entry) => isExternalWorkspace(entry.cwd, workspace.path)));
      return sessions.filter((_, index) => matches[index]);
    },
    async read(workspace: WorkspaceRef, sessionId: string) {
      const { thread } = await (await connect()).request("thread/read", { threadId: sessionId, includeTurns: true }, readSchema);
      if (thread.id !== sessionId || !await isExternalWorkspace(thread.cwd, workspace.path)) {
        throw new ExecutionCommandError("invalid", "This external conversation belongs to a different workspace");
      }
      if (thread.turns.some((turn) => turn.status === "inProgress")) {
        throw new ExecutionCommandError("conflict", "Stop the active Codex turn before resuming it in Nora");
      }
      const origin = await codexSessionOrigin(thread);
      if (!origin) throw new ExecutionCommandError("invalid", "This conversation is not a local CLI or desktop session");
      const info = session(thread, origin);
      const turns: ExternalTurn[] = thread.turns.map((turn) => {
        const result: ExternalTurn = { id: turn.id, instruction: "", state: turn.status === "completed" ? "completed"
          : turn.status === "failed" ? "failed" : "interrupted", items: [] };
        for (const value of turn.items) {
          const parsed = itemSchema.safeParse(value);
          const nativeId = identitySchema.safeParse(value);
          const identity = { id: nativeId.success ? nativeId.data.id : `${turn.id}:${result.items.length}`, runId: turn.id, createdAt: info.createdAt };
          if (parsed.success) {
            const item = parsed.data;
            switch (item.type) {
              case "userMessage": {
                const text = item.content.filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n");
                result.instruction = [result.instruction, text].filter(Boolean).join("\n");
                result.items.push({ ...identity, kind: "message", role: "user", text, complete: true });
                break;
              }
              case "agentMessage": result.items.push({ ...identity, kind: "message", role: "assistant", text: item.text, complete: true }); break;
              case "reasoning": result.items.push({ ...identity, kind: "reasoning", text: [...item.summary, ...item.content].join("\n"), complete: true }); break;
              case "fileChange": result.items.push({ ...identity, kind: "changes", paths: item.changes.map((change) => change.path),
                patches: Object.fromEntries(item.changes.map((change) => [change.path, change.diff ?? null])), attribution: "turn" }); break;
            }
          } else {
            const tool = normalizeCodexTool(value, identity, true);
            if (tool) result.items.push(tool);
          }
        }
        result.instruction ||= "external turn";
        return result;
      });
      return { session: info, turns };
    }
  };
}
