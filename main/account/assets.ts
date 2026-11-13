export const ACCOUNT_SCHEME = "nora-account";
export const ACCOUNT_ORIGIN = `${ACCOUNT_SCHEME}://renderer`;

/** Serve only built renderer assets; workspace files and runtime configuration stay behind IPC. */
export function accountAssetPath(url: string): string | null {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return null; }
  if (parsed.protocol !== `${ACCOUNT_SCHEME}:` || parsed.host !== "renderer" || parsed.username || parsed.password) return null;
  switch (parsed.pathname) {
    case "/": return "index.html";
    case "/bundle.js": return "bundle.js";
    case "/styles.css": return "styles.css";
    case "/icon.svg": return "icon.svg";
    case "/icon.png": return "icon.png";
    case "/icon-256.png": return "icon-256.png";
    default: return /^\/(fonts\/[a-zA-Z0-9-]+\.woff2|product-icons\/[a-zA-Z0-9][a-zA-Z0-9.-]*\.(svg|png))$/.test(parsed.pathname) ? parsed.pathname.slice(1) : null;
  }
}
