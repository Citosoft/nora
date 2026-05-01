import type { ExternalHarnessDiscoveryAdapter } from "../../types/externalHarnessDiscovery.types";
import { discoverClaudeExternalHarnessCandidates } from "./claudeAdapter";
import { discoverCodexExternalHarnessCandidates } from "./codexAdapter";
import { discoverCursorExternalHarnessCandidates } from "./cursorAdapter";
import { discoverGeminiExternalHarnessCandidates } from "./geminiAdapter";

export const externalHarnessDiscoveryAdapters: readonly ExternalHarnessDiscoveryAdapter[] = [
  {
    toolId: "codex",
    discoverExternalHarnessCandidates: discoverCodexExternalHarnessCandidates
  },
  {
    toolId: "claude",
    discoverExternalHarnessCandidates: discoverClaudeExternalHarnessCandidates
  },
  {
    toolId: "gemini",
    discoverExternalHarnessCandidates: discoverGeminiExternalHarnessCandidates
  },
  {
    toolId: "cursor",
    discoverExternalHarnessCandidates: discoverCursorExternalHarnessCandidates
  }
];
