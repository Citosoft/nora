/** Web: a new tab without giving the opened page a handle back to this one. */
export async function openExternalUrl(url: string): Promise<void> {
  globalThis.open?.(url, "_blank", "noopener,noreferrer");
}
