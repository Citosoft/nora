import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NORA_TOOLS } from "@shared/nora-tools/catalog";
import { SECRET_COMMAND_MAX, SECRET_PURPOSE_MAX, secretNameSchema, secretScopeSchema } from "@shared/secrets/contracts";
import type { NoraToolContext, NoraToolDeps } from "@main/types/nora-tools/noraTools.types";
import { runTool } from "./result";

const DEFAULT_TIMEOUT_SECONDS = 120;
const MAX_TIMEOUT_SECONDS = 600;
/** Output beyond this is cut from the front: what a command printed last says how it ended. */
const OUTPUT_MAX_CHARS = 30_000;
const NEVER_IN_CHAT = "Do not ask for it in chat.";

const scopeInput = secretScopeSchema.optional();
const tail = (output: string): string => output.length > OUTPUT_MAX_CHARS ? `[…earlier output cut]\n${output.slice(-OUTPUT_MAX_CHARS)}` : output;

export function registerSecretTools(server: McpServer, context: NoraToolContext, deps: NoraToolDeps): void {
  server.registerTool("request_secret", { ...NORA_TOOLS.request_secret,
    inputSchema: {
      name: secretNameSchema.describe("The secret's name, which is also the environment variable commands read it from, such as GITHUB_TOKEN"),
      purpose: z.string().trim().min(1).max(SECRET_PURPOSE_MAX).describe("What the secret is and why you need it; shown to the user in the dialog and kept with the secret"),
      scope: scopeInput.describe("workspace (default) saves it for this workspace only; everywhere makes it available in every workspace"),
      multiline: z.boolean().optional().describe("True for values with line breaks, such as a private key or a service-account file")
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  }, (input, extra) => runTool(async () => {
    const outcome = await deps.secrets.request({ name: input.name, purpose: input.purpose, scope: input.scope ?? "workspace", multiline: input.multiline ?? false }, context, extra.signal);
    switch (outcome) {
      case "saved": return `${input.name} is saved securely. Use it with run_with_secrets, where it is the environment variable ${input.name}. Its value is never shown to you.`;
      case "declined": return `The user declined to provide ${input.name}. Continue without it or ask how they would like to proceed. ${NEVER_IN_CHAT}`;
      case "unanswered": return `The user has not answered the request for ${input.name} yet. Tell them it is waiting and call request_secret again when they are ready. ${NEVER_IN_CHAT}`;
    }
  }));
  server.registerTool("list_secrets", { ...NORA_TOOLS.list_secrets, annotations: { readOnlyHint: true, openWorldHint: false } }, () => runTool(() =>
    deps.secrets.list(context).map((secret) => `- ${secret.name} (${secret.scope === "workspace" ? "this workspace" : "everywhere"})${secret.purpose ? `: ${secret.purpose}` : ""}`).join("\n")
      || "No secrets are saved for this workspace."));
  server.registerTool("run_with_secrets", { ...NORA_TOOLS.run_with_secrets,
    inputSchema: {
      command: z.string().trim().min(1).max(SECRET_COMMAND_MAX).describe("The shell command, reading each secret from its environment variable"),
      secrets: z.array(secretNameSchema).min(1).max(20).describe("Names of the saved secrets to set as environment variables (from list_secrets)"),
      timeout_seconds: z.number().int().min(1).max(MAX_TIMEOUT_SECONDS).optional().describe(`How long the command may run (default ${DEFAULT_TIMEOUT_SECONDS})`)
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true }
  }, (input, extra) => runTool(async () => {
    const outcome = await deps.secrets.run({ command: input.command, secrets: input.secrets, timeoutSeconds: input.timeout_seconds ?? DEFAULT_TIMEOUT_SECONDS }, context, extra.signal);
    if (outcome.kind === "declined") throw new Error("The user did not allow this command to use those secrets. Do not retry it unchanged; ask how they would like to proceed.");
    if (outcome.kind === "unanswered") throw new Error("The user has not approved this command yet. Tell them it is waiting for their approval before trying again.");
    const status = outcome.timedOut ? "Timed out and was stopped" : outcome.exitCode === null ? "Stopped before it finished" : `Exit code ${outcome.exitCode}`;
    return `${status}\n${tail(outcome.output) || "(no output)"}`;
  }));
  server.registerTool("delete_secret", { ...NORA_TOOLS.delete_secret,
    inputSchema: { name: secretNameSchema.describe("The secret's name"), scope: scopeInput.describe("Which one to delete: workspace (default) or everywhere") },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
  }, (input) => runTool(() => {
    const scope = input.scope ?? "workspace";
    if (!deps.secrets.remove(input.name, scope, context)) throw new Error(`No secret named ${input.name} is saved ${scope === "workspace" ? "for this workspace" : "everywhere"}. See list_secrets.`);
    return `Deleted ${input.name}.`;
  }));
}
