import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { z } from "zod";

const origin = "nora-account://renderer";
const instanceSchema = z.object({ id: z.string(), environment_type: z.string(), allowed_origins: z.array(z.string()).nullable() });
const expectedInstance = process.argv[2];
if (!expectedInstance?.startsWith("ins_")) throw new Error("Usage: node scripts/configure-clerk.mjs <Clerk instance ID>");
if (!process.stdin.isTTY) throw new Error("Run this setup interactively in your terminal.");

// Suppress readline's terminal echo. The key is kept only in this process's memory.
const muted = new Writable({ write(_chunk, _encoding, done) { done(); } });
const prompt = createInterface({ input: process.stdin, output: muted, terminal: true });
let key;
try {
  process.stdout.write("Paste the Clerk secret key for this instance (hidden; never saved): ");
  key = (await prompt.question("")).trim();
  process.stdout.write("\n");
} finally { prompt.close(); }
if (!/^sk_(test|live)_/.test(key)) throw new Error("Expected a Clerk secret key.");

async function request(method, body) {
  const response = await fetch("https://api.clerk.com/v1/instance", {
    method, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`Clerk setup failed (HTTP ${response.status}). Check the instance and key permissions.`);
  return response;
}
try {
  const instance = instanceSchema.parse(await (await request("GET")).json());
  if (instance.id !== expectedInstance) throw new Error("This key belongs to a different Clerk instance. No settings were changed.");
  const origins = [...new Set([...(instance.allowed_origins ?? []), origin])];
  if (!instance.allowed_origins?.includes(origin)) await request("PATCH", { allowed_origins: origins });
  const verified = instanceSchema.parse(await (await request("GET")).json());
  if (!verified.allowed_origins?.includes(origin)) throw new Error("Clerk did not save the desktop origin.");
  console.log(`Nora's desktop origin is enabled for this ${verified.environment_type} instance. Existing origins were preserved.`);
} finally { key = undefined; }
