/**
 * Browsers send no label: a custom header would need a CORS preflight that older desktops reject.
 * The desktop describes browsers from their User-Agent instead.
 */
export function describeThisDevice(): string | null {
  return null;
}
