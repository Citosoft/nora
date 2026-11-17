import type { DirectContextModelRequest, DirectContextSection } from "@shared/ipc/types/directContextGateway.types";
import type { ContextRequestTally, ContextSectionTally } from "@/components/app/types/chatContext.types";

/** Characters per token for English prose and code; providers tokenize differently, so every count derived from it is approximate. */
const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function tallySection(section: DirectContextSection): ContextSectionTally {
  return { section, tokens: section.text === null ? null : estimateTokens(section.text) };
}

/**
 * Token totals for one request. Visible text is estimated; the provider's own prompt and a continuing thread's history are not
 * visible, so when the provider measured the thread's last request the next one is that occupancy plus this turn's new text.
 */
export function tallyContextRequest(request: DirectContextModelRequest): ContextRequestTally {
  const sections = request.sections.map(tallySection);
  const sum = (placement: DirectContextSection["placement"]) => sections.reduce((total, entry) =>
    entry.section.placement === placement ? total + (entry.tokens ?? 0) : total, 0);
  const system = sum("system");
  const turn = sum("turn");
  const measured = request.lastRequest ? request.lastRequest.usedTokens + turn : null;
  return { sections, system, turn, visible: system + turn, next: measured ?? system + turn, measured: measured !== null,
    window: request.lastRequest?.windowTokens ?? null };
}

/** Compact counts such as 1.2k for headers and badges. */
export function formatTokens(tokens: number): string {
  if (tokens < 1000) return String(tokens);
  return `${(tokens / 1000).toFixed(tokens < 10_000 ? 1 : 0)}k`;
}
