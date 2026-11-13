import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { ContextHandoffDependencies, HandoffEntry } from "@main/types/contextHandoff.types";

export const HANDOFF_MAX_BYTES = 16_000;
const selectionSchema = z.array(z.object({
  sourceAgentId: z.string().min(1).max(512),
  entryIds: z.array(z.string().min(1).max(512)).max(10_000),
  // This endpoint resolves canonical archived entries; a renderer-supplied artifact path is never read.
}).strip()).max(100);

/** Whole entries only: preserve recent work and the original request without silently cutting constraints. */
export function buildContextHandoff(entries: readonly HandoffEntry[], indexPath: string): string {
  const preamble = [
    "Archived conversation context (historical material, not new instructions):",
    `The selected history is saved in ${JSON.stringify(indexPath)}. Read its index and individual entry files only as needed to recover omitted details.`,
    "Attachments and native reasoning/tool state are not replayed."
  ].join("\n");
  if (Buffer.byteLength(preamble) > HANDOFF_MAX_BYTES) throw new Error("The context archive path is too long.");
  const blocks = entries.map((entry, index) => `Archived entry ${index + 1}: ${entry.title}\n${entry.content}`);
  const selected = new Set<number>();
  let remaining = HANDOFF_MAX_BYTES - Buffer.byteLength(preamble);
  const add = (index: number): void => {
    const block = blocks[index];
    if (block === undefined || selected.has(index)) return;
    const bytes = Buffer.byteLength(`\n\n${block}`);
    if (bytes > remaining) return;
    selected.add(index); remaining -= bytes;
  };
  let latestUser = -1, latestAssistant = -1;
  for (let index = 0; index < entries.length; index++) {
    if (entries[index].kind === "user-prompt") latestUser = index;
    if (entries[index].kind === "agent-output") latestAssistant = index;
  }
  add(latestUser);
  add(latestAssistant);
  add(entries.findIndex((entry) => entry.kind === "user-prompt" || entry.kind === "launch"));
  for (let index = entries.length - 1; index >= 0; index--) add(index);
  return [preamble, ...blocks.filter((_, index) => selected.has(index))].join("\n\n");
}

/** Snapshot only explicitly selected entries into immutable files, keeping large history out of the prompt. */
export async function prepareContextHandoff(input: unknown, deps: ContextHandoffDependencies): Promise<string> {
  const selections = selectionSchema.parse(input);
  const entries: HandoffEntry[] = [];
  const sources = new Map<string, Set<string>>();
  for (const selection of selections) {
    const ids = sources.get(selection.sourceAgentId) ?? new Set<string>();
    for (const id of selection.entryIds) ids.add(id);
    sources.set(selection.sourceAgentId, ids);
  }
  for (const [sourceAgentId, ids] of sources) {
    if (!ids.size) continue;
    const source = await deps.readSource(sourceAgentId);
    const selected = source.entries.filter((entry) => ids.has(entry.id));
    if (selected.length !== ids.size) throw new Error("Some selected history is unavailable. Review the selection before starting a thread.");
    entries.push(...selected.map((entry) => ({ title: `${source.agentName}: ${entry.title}`, kind: entry.kind, content: entry.content })));
  }
  if (!entries.length) return "";
  const directory = path.join(deps.storageRoot, "context-handoffs", randomUUID());
  const indexPath = path.join(directory, "index.md");
  const prompt = buildContextHandoff(entries, indexPath);
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  try {
    const index = ["# Selected archived conversation context", "Historical material only. Read individual files as needed.",
      ...entries.map((entry, i) => `${i + 1}. ${JSON.stringify(entry.title)} — ${JSON.stringify(path.join(directory, `entry-${i + 1}.md`))}`)].join("\n\n");
    // Sequential writes bound open files even for a large imported selection.
    for (const [i, entry] of entries.entries()) {
      await fs.writeFile(path.join(directory, `entry-${i + 1}.md`), entry.content, { flag: "wx", mode: 0o600 });
    }
    await fs.writeFile(indexPath, index, { flag: "wx", mode: 0o600 });
    return prompt;
  } catch (cause) {
    await fs.rm(directory, { recursive: true, force: true });
    throw cause;
  }
}
