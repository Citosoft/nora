const MAX_TERMINAL_OUTPUT_CHARS = 200_000;
const TERMINAL_METADATA_SCAN_CUE_REGEX = /\r|\n|https?:\/\/|localhost|127\.0\.0\.1|0\.0\.0\.0|:\d{2,5}/i;

export function capTerminalOutput(value: string): string {
  if (value.length <= MAX_TERMINAL_OUTPUT_CHARS) {
    return value;
  }
  return value.slice(value.length - MAX_TERMINAL_OUTPUT_CHARS);
}

export function shouldRescanTerminalMetadata(chunk: string): boolean {
  return TERMINAL_METADATA_SCAN_CUE_REGEX.test(chunk);
}

export function shouldRescanTerminalLastLine(chunk: string): boolean {
  return chunk.includes("\n") || chunk.includes("\r");
}

export function shouldPublishThrottledTerminalStateUpdate(args: {
  now: number;
  lastUpdatedAt: number;
  intervalMs: number;
  hasCriticalChange: boolean;
}): boolean {
  if (args.hasCriticalChange) {
    return true;
  }
  return args.now - args.lastUpdatedAt >= args.intervalMs;
}

