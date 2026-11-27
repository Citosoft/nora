import { appImportSourceDisplayName } from "@shared/app-import/sources";
import path from "node:path";
import { mapAppImportKeybindings } from "@main/app-import/keybindingMapping";
import { resolveImportThreads } from "@main/app-import/threadResolution";
import type { AppImportReadResult, AppImportTranscript, AppImportTranscriptMessage } from "@shared/types/app-import/appImportPlan.types";
import type { AppImportEnvironment, AppImportReadContext, AppImportSource } from "@main/types/app-import/appImportSource.types";
import type { OrcaLoad, OrcaTranscriptSeed } from "@main/types/app-import/orca.types";
import { orcaKeybindingMapping } from "./keybindingMapping";
import { readOrcaBots } from "./bots";
import { readOrcaKeybindings } from "./keybindings";
import { orcaUserDataDirectory } from "./paths";
import { listOrcaSkippedStores } from "./protectedStores";
import { readOrcaRepos } from "./repos";
import { readOrcaSettings } from "./settings";
import { locateOrcaStore, readOrcaStore } from "./store";
import { readOrcaThreads, readOrcaWorktreeMeta } from "./threads";

const DISPLAY_NAME = appImportSourceDisplayName("orca");
/** PersistedState domains the importer reads; everything else in the profile is never loaded. */
const DOMAINS = ["repos", "worktreeMeta", "settings", "workspaceSession", "workspaceSessionsByHostId", "sshTargets", "bots", "botsNewerAgents", "botOrder", "automations"] as const;

async function loadOrca(env: AppImportEnvironment): Promise<OrcaLoad> {
  const { location, searchedPaths } = await locateOrcaStore(env);
  if (!location) return { status: "failed", detection: { status: "notFound", source: "orca", searchedPaths } };
  const store = await readOrcaStore(location, DOMAINS);
  if (store.status !== "ok") return { status: "failed", detection: { status: store.status, source: "orca", dataPath: location.path, reason: store.reason } };
  return { status: "loaded", detection: { status: "found", source: "orca", dataPath: location.path, format: { source: "orca", store: location.store, version: store.version } }, store };
}

function transcriptFrom(seed: OrcaTranscriptSeed): AppImportTranscript | undefined {
  const messages: AppImportTranscriptMessage[] = [];
  if (seed.prompt) messages.push({ role: "user", text: seed.prompt, createdAt: seed.promptAt });
  if (seed.lastAssistantMessage) messages.push({ role: "assistant", text: seed.lastAssistantMessage, createdAt: seed.replyAt });
  return messages.length > 0 ? { completeness: "partial", messages } : undefined;
}

async function readOrcaPlan(context: AppImportReadContext): Promise<AppImportReadResult> {
  const load = await loadOrca(context.env);
  if (load.status === "failed") return load.detection;
  const { detection, store } = load;
  const userData = orcaUserDataDirectory(context.env);
  const repos = await readOrcaRepos(store.domains.get("repos"));
  const threads = readOrcaThreads(store.domains.get("workspaceSession"), readOrcaWorktreeMeta(store.domains.get("worktreeMeta")), repos.byRepoId);
  const settings = readOrcaSettings(store.domains.get("settings"), context.env, repos.byRepoId);
  const [keybindings, stores, resolved, bots] = await Promise.all([
    readOrcaKeybindings(context.env),
    listOrcaSkippedStores(userData, store.domains),
    resolveImportThreads(threads.candidates, context.sessions, (thread) => {
      const seed = threads.transcripts.get(thread.importKey);
      return seed ? transcriptFrom(seed) : undefined;
    }),
    readOrcaBots({ bots: store.domains.get("bots"), newerAgents: store.domains.get("botsNewerAgents"), order: store.domains.get("botOrder"), automations: store.domains.get("automations") }, context.env)
  ]);
  const mappedKeybindings = mapAppImportKeybindings(keybindings.keybindings, orcaKeybindingMapping);
  return {
    status: "ready",
    plan: {
      source: { id: "orca", displayName: DISPLAY_NAME, dataPath: path.dirname(detection.dataPath), format: detection.format },
      workspaces: repos.workspaces,
      threads: resolved.threads,
      setupScripts: repos.setupScripts,
      terminalPresets: [...repos.terminalPresets, ...settings.terminalPresets],
      settings: settings.settings,
      keybindings: mappedKeybindings.keybindings,
      envVars: settings.envVars,
      bots: bots.bots,
      skipped: [...repos.skipped, ...threads.skipped, ...settings.skipped, ...mappedKeybindings.skipped, ...bots.skipped, ...stores.skipped],
      warnings: [...repos.warnings, ...keybindings.warnings, ...stores.warnings, ...resolved.warnings]
    }
  };
}

export const orcaSource: AppImportSource = {
  id: "orca",
  displayName: DISPLAY_NAME,
  detect: async (env) => (await loadOrca(env)).detection,
  readPlan: readOrcaPlan
};
