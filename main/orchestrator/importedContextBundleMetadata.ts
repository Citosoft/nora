import type { ImportedContextBundleSummary } from "@shared/appTypes";
import { estimateContextSize } from "./agentContextArtifacts";

export type ParsedImportedContextBundleHeader = {
  bundleId: string | null;
  generatedAt: string | null;
  targetAgent: string | null;
  /** Each entry like `Name (ToolLabel)` from `##` section headers. */
  sourceAgents: string[];
};

/**
 * Reads the fixed header Nora writes in {@link buildContextBundleMarkdown} (first lines only).
 */
export function parseImportedContextBundleHeader(markdown: string): ParsedImportedContextBundleHeader {
  const lines = markdown.split(/\r?\n/);
  let bundleId: string | null = null;
  let generatedAt: string | null = null;
  let targetAgent: string | null = null;
  const sourceAgents: string[] = [];
  const sourceSection = /^##\s+(.+?)\s+\(([^)]+)\)\s*$/;

  for (const line of lines) {
    const idMatch = line.match(/^Bundle ID:\s*(.+?)\s*$/);
    if (idMatch) {
      bundleId = idMatch[1]!.trim();
      continue;
    }
    const genMatch = line.match(/^Generated:\s*(.+?)\s*$/);
    if (genMatch) {
      generatedAt = genMatch[1]!.trim();
      continue;
    }
    const targetMatch = line.match(/^Target agent:\s*(.+?)\s*$/);
    if (targetMatch) {
      targetAgent = targetMatch[1]!.trim();
      continue;
    }
    const srcMatch = line.match(sourceSection);
    if (srcMatch) {
      sourceAgents.push(`${srcMatch[1]!.trim()} (${srcMatch[2]!.trim()})`);
    }
  }

  return { bundleId, generatedAt, targetAgent, sourceAgents };
}

export function computeImportedBundleApproxTokens(options: {
  fullMarkdownUtf8: string | null;
  byteSize: number;
}): number | null {
  if (options.fullMarkdownUtf8 && options.fullMarkdownUtf8.length > 0) {
    return estimateContextSize(options.fullMarkdownUtf8.length).estimatedTokens;
  }
  if (options.byteSize > 0) {
    return estimateContextSize(Math.ceil(options.byteSize / 3)).estimatedTokens;
  }
  return null;
}

export function buildImportedContextBundleListMetadata(
  markdownForParse: string,
  tokenOptions: { fullMarkdownUtf8: string | null; byteSize: number }
): Pick<
  ImportedContextBundleSummary,
  | "displayTarget"
  | "handoffCreatedAt"
  | "displaySources"
  | "primarySourceAgentLabel"
  | "extraSourceAgentCount"
  | "approxEstimatedTokens"
> {
  const parsed = parseImportedContextBundleHeader(markdownForParse);
  const primarySourceAgentLabel = parsed.sourceAgents[0] ?? null;
  const extraSourceAgentCount = Math.max(0, parsed.sourceAgents.length - 1);
  return {
    displayTarget: parsed.targetAgent,
    handoffCreatedAt: parsed.generatedAt,
    displaySources: parsed.sourceAgents.length > 0 ? parsed.sourceAgents.join(", ") : null,
    primarySourceAgentLabel,
    extraSourceAgentCount,
    approxEstimatedTokens: computeImportedBundleApproxTokens(tokenOptions)
  };
}
