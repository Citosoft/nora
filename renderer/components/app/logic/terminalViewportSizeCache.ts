export type TerminalViewportSize = {
  cols: number;
  rows: number;
};

const terminalViewportSizeCache = new Map<string, TerminalViewportSize>();

export function getCachedTerminalViewportSize(sessionId: string): TerminalViewportSize | null {
  return terminalViewportSizeCache.get(sessionId) ?? null;
}

export function setCachedTerminalViewportSize(sessionId: string, size: TerminalViewportSize): void {
  terminalViewportSizeCache.set(sessionId, size);
}
