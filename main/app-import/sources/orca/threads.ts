import { z } from "zod";
import { appImportKey } from "@main/app-import/importKey";
import { toProviderRef } from "@main/app-import/providerRef";
import { toIsoTimestamp } from "@main/app-import/timestamps";
import type { AppImportSkippedItem } from "@shared/types/app-import/appImportPlan.types";
import type { AppImportThreadCandidate } from "@main/types/app-import/appImportSource.types";
import type { OrcaRepoLink, OrcaThreadSeed, OrcaThreadSeeds, OrcaThreads, OrcaTranscriptSeed, OrcaWorktreeMeta, OrcaWorktreeRef } from "@main/types/app-import/orca.types";

const text = z.string().trim().min(1).optional().catch(undefined);
const epoch = z.number().optional().catch(undefined);
/** Agent Sleep records (orca src/shared/agent-session/lifecycle/agent-session-resume.ts `SleepingAgentSessionRecord`). */
const sleepingRecordSchema = z.object({
  worktreeId: z.string().min(1),
  tabId: z.string().optional().catch(undefined),
  agent: z.string().min(1),
  providerSession: z.object({ id: z.string().min(1), cwd: text }),
  prompt: text,
  lastAssistantMessage: text,
  terminalTitle: text,
  capturedAt: epoch,
  updatedAt: epoch
});
/** Saved terminal tabs; `aiVaultTitle` binds the tab to a Claude/Codex session id. */
const terminalTabSchema = z.object({
  id: z.string().min(1),
  title: text,
  customTitle: text.nullable().catch(null),
  generatedTitle: text.nullable().catch(null),
  createdAt: epoch,
  startupCwd: text,
  launchAgent: text,
  aiVaultTitle: z.object({ agent: z.string().min(1), sessionId: z.string().min(1), title: text }).nullable().optional().catch(null)
});
const sessionSchema = z.object({
  sleepingAgentSessionsByPaneKey: z.record(z.string(), z.unknown()).optional().catch(undefined),
  tabsByWorktree: z.record(z.string(), z.array(z.unknown()).catch([])).optional().catch(undefined)
});
const worktreeMetaSchema = z.object({ isPinned: z.boolean().optional().catch(undefined), isArchived: z.boolean().optional().catch(undefined), baseRef: text });

/** `<repoId>::<absolute path>`, optionally host-qualified as `<host>|<repoId>::<path>`. */
export function parseOrcaWorktreeId(worktreeId: string): OrcaWorktreeRef | null {
  const separator = worktreeId.indexOf("::");
  if (separator <= 0) return null;
  const qualifiedRepo = worktreeId.slice(0, separator);
  return { repoId: qualifiedRepo.slice(qualifiedRepo.indexOf("|") + 1), path: worktreeId.slice(separator + 2) };
}

export function readOrcaWorktreeMeta(raw: unknown): ReadonlyMap<string, OrcaWorktreeMeta> {
  const result = new Map<string, OrcaWorktreeMeta>();
  if (typeof raw !== "object" || raw === null) return result;
  for (const [worktreeId, value] of Object.entries(raw)) {
    const id = parseOrcaWorktreeId(worktreeId);
    const meta = worktreeMetaSchema.safeParse(value);
    if (id && meta.success) result.set(`${id.repoId}::${id.path}`, { ...id, pinned: meta.data.isPinned ?? false, archived: meta.data.isArchived ?? false, baseRef: meta.data.baseRef });
  }
  return result;
}

function firstLine(value: string | undefined): string | undefined {
  return value?.split("\n").find((line) => line.trim())?.trim().slice(0, 100);
}

/** Session seeds from sleeping records first (they carry prompt and reply), then agent tabs bound to a session. */
function collectSeeds(session: z.infer<typeof sessionSchema>): OrcaThreadSeeds {
  const seeds = new Map<string, OrcaThreadSeed>();
  const boundTabs = new Set<string>();
  for (const raw of Object.values(session.sleepingAgentSessionsByPaneKey ?? {})) {
    const record = sleepingRecordSchema.safeParse(raw);
    if (!record.success) continue;
    const { agent, providerSession, worktreeId, tabId } = record.data;
    if (tabId) boundTabs.add(tabId);
    const key = `${agent}\0${providerSession.id}`;
    if (seeds.has(key)) continue;
    seeds.set(key, { agent, sessionId: providerSession.id, worktreeId, cwd: providerSession.cwd, title: record.data.terminalTitle ?? firstLine(record.data.prompt),
      createdAt: record.data.capturedAt, updatedAt: record.data.updatedAt ?? record.data.capturedAt,
      transcript: { prompt: record.data.prompt, lastAssistantMessage: record.data.lastAssistantMessage } });
  }
  let unboundAgentTabs = 0;
  for (const [worktreeId, tabs] of Object.entries(session.tabsByWorktree ?? {})) {
    for (const raw of tabs) {
      const tab = terminalTabSchema.safeParse(raw);
      if (!tab.success) continue;
      const bound = tab.data.aiVaultTitle;
      if (!bound) {
        if (tab.data.launchAgent && !boundTabs.has(tab.data.id)) unboundAgentTabs++;
        continue;
      }
      const key = `${bound.agent}\0${bound.sessionId}`;
      const title = tab.data.customTitle ?? bound.title ?? tab.data.generatedTitle ?? undefined;
      const existing = seeds.get(key);
      if (existing) {
        if (title) existing.title = title;
        continue;
      }
      seeds.set(key, { agent: bound.agent, sessionId: bound.sessionId, worktreeId, cwd: tab.data.startupCwd, title: title ?? tab.data.title, createdAt: tab.data.createdAt, updatedAt: tab.data.createdAt, transcript: undefined });
    }
  }
  return { seeds: [...seeds.values()], unboundAgentTabs };
}

export function readOrcaThreads(rawSession: unknown, worktreeMeta: ReadonlyMap<string, OrcaWorktreeMeta>, byRepoId: ReadonlyMap<string, OrcaRepoLink>): OrcaThreads {
  const session = sessionSchema.safeParse(rawSession);
  const { seeds, unboundAgentTabs } = session.success ? collectSeeds(session.data) : { seeds: [], unboundAgentTabs: 0 };
  const candidates: AppImportThreadCandidate[] = [];
  const transcripts = new Map<string, OrcaTranscriptSeed>();
  let orphaned = 0;
  for (const seed of seeds) {
    const worktree = parseOrcaWorktreeId(seed.worktreeId);
    const repo = worktree ? byRepoId.get(worktree.repoId) : undefined;
    if (!worktree || !repo) { orphaned++; continue; }
    const meta = worktreeMeta.get(`${worktree.repoId}::${worktree.path}`);
    const provider = toProviderRef(seed.agent);
    const createdAt = toIsoTimestamp(seed.createdAt, new Date(0).toISOString());
    const updatedAt = toIsoTimestamp(seed.updatedAt, createdAt);
    const importKey = appImportKey("orca", "thread", seed.agent, seed.sessionId);
    candidates.push({
      importKey, workspaceImportKey: repo.importKey, title: seed.title ?? `${seed.agent} session`, ...provider, nativeSessionId: seed.sessionId,
      cwd: seed.cwd ?? worktree.path, ...(worktree.path !== repo.path ? { worktreePath: worktree.path } : {}),
      pinned: meta?.pinned ?? false, archived: meta?.archived ?? false, createdAt, updatedAt
    });
    if (seed.transcript) transcripts.set(importKey, { ...seed.transcript, promptAt: createdAt, replyAt: updatedAt });
  }
  const skipped: AppImportSkippedItem[] = [];
  if (orphaned > 0) skipped.push({ kind: "thread", label: `${orphaned} agent sessions without a local repository`, reason: "Their repository is remote, removed or missing." });
  if (unboundAgentTabs > 0) skipped.push({ kind: "thread", label: `${unboundAgentTabs} agent terminals without a recorded session`, reason: "Orca did not record a Claude or Codex session id for them, so there is nothing to resume." });
  return { candidates, transcripts, skipped };
}
