import type { AppImportThread } from "@shared/types/app-import/appImportPlan.types";
import type { NativeProviderKind } from "@shared/types/provider/providerKind.types";
import type { AppImportThreadCandidate, AppImportThreadResolution, AppImportTranscriptLoader, NativeSessionLookup } from "@main/types/app-import/appImportSource.types";

function isNativeProvider(provider: AppImportThreadCandidate["provider"]): provider is NativeProviderKind {
  return provider === "claude" || provider === "codex";
}

/**
 * Marks each thread resumable when Nora's history readers still see its native session from its
 * cwd, and attaches the source's stored transcript only to threads that are not.
 */
export async function resolveImportThreads(candidates: readonly AppImportThreadCandidate[], lookup: NativeSessionLookup, loadTranscript: AppImportTranscriptLoader): Promise<AppImportThreadResolution> {
  const warnings = new Set<string>();
  const isResumable = async ({ provider, nativeSessionId, cwd }: AppImportThreadCandidate): Promise<boolean> => {
    if (!nativeSessionId || !isNativeProvider(provider)) return false;
    try {
      return (await lookup.listSessionIds(provider, cwd)).has(nativeSessionId);
    } catch {
      warnings.add(`Could not check ${provider === "claude" ? "Claude" : "Codex"} session history; affected threads are marked not resumable.`);
      return false;
    }
  };
  const threads = await Promise.all(candidates.map(async (candidate): Promise<AppImportThread> => {
    if (await isResumable(candidate)) return { ...candidate, resumable: true };
    const transcript = loadTranscript(candidate);
    return { ...candidate, resumable: false, ...(transcript ? { transcript } : {}) };
  }));
  return { threads, warnings: [...warnings] };
}
