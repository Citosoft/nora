import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { z } from "zod";

// No turn, model inference or user account is used. Authentication/cost-bearing tests are separate.
const require = createRequire(import.meta.url);
const { version } = require("../package.json");
const { StdioRpc } = require("../dist/main/providers/codex/stdioRpc.js");
const sdk = require("@anthropic-ai/claude-agent-sdk");
if (typeof sdk.query !== "function") throw new Error("Claude SDK could not be loaded in this runtime");
const directory = mkdtempSync(join(tmpdir(), "nora-native-smoke-"));
const environment = { ...process.env, CODEX_HOME: directory };
for (const name of ["OPENAI_API_KEY", "CODEX_API_KEY", "ACCESS_TOKEN"]) delete environment[name];
const child = spawn(process.env.NORA_CODEX_EXECUTABLE || "codex", ["app-server", "--listen", "stdio://"], {
  env: environment, stdio: "pipe"
});
const rpc = new StdioRpc({ process: child, timeoutMs: 10_000, onNotification() {},
  async onRequest() { throw new Error("No provider requests are expected during initialization"); }, onDisconnect() {} });
try {
  const response = await rpc.request("initialize", {
    clientInfo: { name: "nora", title: "Nora native smoke", version }, capabilities: { experimentalApi: true }
  }, z.object({ userAgent: z.string() }));
  rpc.notify("initialized", {});
  let claudeDiscovery = "not requested (set NORA_CLAUDE_EXECUTABLE to check native discovery)";
  if (process.env.NORA_CLAUDE_EXECUTABLE) {
    const { createClaudeDiscovery } = require("../dist/main/providers/claude/discovery.js");
    const configDirectory = join(directory, "claude-config");
    mkdirSync(configDirectory, { mode: 0o700 });
    const claudeEnvironment = { ...process.env, CLAUDE_CONFIG_DIR: configDirectory };
    // Explicit undefined overrides inherited credentials when the SDK bridge merges its environment.
    for (const name of ["ANTHROPIC_API_KEY", "CLAUDE_CODE_OAUTH_TOKEN", "ANTHROPIC_AUTH_TOKEN"]) claudeEnvironment[name] = undefined;
    const discovery = await createClaudeDiscovery({ executablePath: process.env.NORA_CLAUDE_EXECUTABLE, environment: claudeEnvironment })(directory);
    claudeDiscovery = `${discovery.models.length} catalog models, authentication ${discovery.authentication}`;
  }
  console.log(JSON.stringify({ codex: response.userAgent, claudeSdk: "loaded", claudeDiscovery, inference: "not invoked", state: "isolated temporary directory" }));
} finally {
  const exited = child.exitCode !== null || child.signalCode !== null ? Promise.resolve() : new Promise((resolve) => child.once("close", resolve));
  rpc.close(); await exited;
  rmSync(directory, { recursive: true, force: true });
}
