// Applies the Cloudflare zone rules that keep runtime hostnames API-only.
//
// Runtime hostnames (`<32 base32 chars>.<RUNTIME_HOSTNAME_SUFFIX>`) tunnel to machines their users control, yet share the
// registrable domain with the web app and Clerk. These rules stop browsers treating them as pages, so a runtime can
// neither render content as the Nora domain nor plant cookies on it:
//   1. WAF custom rule: block requests a browser makes to display or execute content (documents, frames, workers…).
//      The app only calls runtimes with fetch (`Sec-Fetch-Dest: empty`) and WebSocket; native clients send no header.
//   2. Response header rule: strip Set-Cookie and send a sandboxing CSP, covering browsers without Fetch Metadata.
//
// Usage: node scripts/apply-runtime-edge-rules.mjs [--dry-run]
// Needs a short-lived API token scoped to the zone with "Zone WAF: Edit" and "Transform Rules: Edit", taken from
// CLOUDFLARE_RULES_TOKEN or else prompted for without echo. It is held in memory only and never saved. Re-running is safe: rules are matched by `ref` and replaced;
// every other rule in the zone's rulesets is preserved.
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";

const LABEL_LENGTH = 32; // Keep in sync with RUNTIME_LABEL_LENGTH in src/hostname.ts.
const dryRun = process.argv.includes("--dry-run");

const wranglerText = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
const wrangler = JSON.parse(wranglerText.replace(/^\s*\/\/.*$/gm, ""));
const zoneId = wrangler.vars?.CLOUDFLARE_ZONE_ID;
const suffix = wrangler.vars?.RUNTIME_HOSTNAME_SUFFIX;
if (!/^[0-9a-f]{32}$/.test(zoneId ?? "") || !/^[a-z0-9.-]+$/.test(suffix ?? "")) {
  throw new Error("wrangler.jsonc must define CLOUDFLARE_ZONE_ID and RUNTIME_HOSTNAME_SUFFIX.");
}

// Free-plan safe: no regex. Real subdomains never reach LABEL_LENGTH characters.
const runtimeHost = `(ends_with(http.host, ".${suffix}") and len(http.host) eq ${LABEL_LENGTH + 1 + suffix.length})`;
const renderingDestinations = ["document", "iframe", "frame", "fencedframe", "embed", "object", "worker", "sharedworker",
  "serviceworker", "script", "style", "image", "font", "audio", "video", "track", "manifest", "xslt"];

/** Desired rules per phase entrypoint, keyed by a stable `ref` so re-runs replace instead of duplicating. */
const desired = [
  {
    phase: "http_request_firewall_custom",
    rule: {
      ref: "nora_runtime_block_rendering",
      description: "Nora runtimes: API only, never rendered by browsers",
      expression: `${runtimeHost} and any(http.request.headers["sec-fetch-dest"][*] in {${renderingDestinations.map((d) => `"${d}"`).join(" ")}})`,
      action: "block"
    }
  },
  {
    phase: "http_response_headers_transform",
    rule: {
      ref: "nora_runtime_sandbox_headers",
      description: "Nora runtimes: no cookies, sandboxed responses",
      expression: runtimeHost,
      action: "rewrite",
      action_parameters: {
        headers: {
          "set-cookie": { operation: "remove" },
          "content-security-policy": { operation: "set", value: "sandbox; default-src 'none'; frame-ancestors 'none'" },
          "x-content-type-options": { operation: "set", value: "nosniff" }
        }
      }
    }
  }
];

if (dryRun) {
  console.log(JSON.stringify(desired, null, 2));
  process.exit(0);
}
/** Prefers CLOUDFLARE_RULES_TOKEN (e.g. read from the Keychain by the caller); otherwise prompts without echo. */
async function readToken() {
  const fromEnv = process.env.CLOUDFLARE_RULES_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  if (!process.stdin.isTTY) throw new Error("Set CLOUDFLARE_RULES_TOKEN or run this setup interactively in your terminal.");
  const muted = new Writable({ write(_chunk, _encoding, done) { done(); } });
  const prompt = createInterface({ input: process.stdin, output: muted, terminal: true });
  try {
    process.stdout.write("Paste a Cloudflare API token with Zone WAF and Transform Rules edit access (hidden; never saved): ");
    return (await prompt.question("")).trim();
  } finally { prompt.close(); process.stdout.write("\n"); }
}
let token = await readToken();
if (!token) throw new Error("No token entered.");

async function api(method, path, body) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000)
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, json };
}

const describeErrors = (json) => (json.errors ?? []).map((error) => `${error.code}: ${error.message}`).join("; ") || "unknown error";

try {
  for (const { phase, rule } of desired) {
    const current = await api("GET", `/rulesets/phases/${phase}/entrypoint`);
    if (current.status !== 200 && current.status !== 404) {
      throw new Error(`Could not read ${phase} (HTTP ${current.status}: ${describeErrors(current.json)}). Check the token's permissions.`);
    }
    // Only fields the API accepts on write; system fields (id, version, last_updated) are dropped.
    const kept = (current.json.result?.rules ?? [])
      .filter((existing) => existing.ref !== rule.ref)
      .map(({ ref, description, expression, action, action_parameters, enabled }) =>
        ({ ref, description, expression, action, ...(action_parameters ? { action_parameters } : {}), enabled }));
    const saved = await api("PUT", `/rulesets/phases/${phase}/entrypoint`, { rules: [...kept, { ...rule, enabled: true }] });
    if (!saved.json.success) throw new Error(`Cloudflare rejected the ${phase} rule: ${describeErrors(saved.json)}. Nothing else in that phase changed.`);
    const verified = saved.json.result.rules.some((existing) => existing.ref === rule.ref && existing.enabled);
    if (!verified) throw new Error(`Cloudflare did not save the ${phase} rule.`);
    console.log(`${phase}: "${rule.description}" applied (${kept.length} other rule(s) preserved).`);
  }
} finally { token = undefined; }
