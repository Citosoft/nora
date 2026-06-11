export const MAX_FORGE_DIFF_PREVIEW_CHARS = 12_000;

export function limitForgeDiffForTransport(diff: string): string {
  if (diff.length <= MAX_FORGE_DIFF_PREVIEW_CHARS) {
    return diff;
  }

  return diff.slice(0, MAX_FORGE_DIFF_PREVIEW_CHARS + 1);
}
