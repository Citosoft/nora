import { join } from "node:path";
import type { LocalHostOptions } from "@main/types/execution/localHost.types";
import type { CrashConfig } from "../types/crash.types";

export function crashHostOptions(config: CrashConfig, recovery = false): LocalHostOptions {
  const environment = Object.fromEntries(Object.entries(config.environment).map(([name, value]) => [name, value ?? undefined]));
  return { databasePath: config.databasePath, environmentId: "acceptance", gitExecutable: "git", shutdownGraceMs: 3000,
    registrations: () => [{ projectId: "acceptance", checkoutId: "registered", path: config.workspacePath }],
    onFailure() {}, instances: [{ kind: "codex", options: { instanceId: "acceptance", executable: process.execPath,
      arguments: [join(__dirname, "proxy.js"), config.auditPath, config.controlPath, recovery ? "recovery" : config.mode, config.executable, ...config.arguments],
      environment, policies: { acceptance: { approvalPolicy: config.mode === "provider-crash" ? "untrusted" : "on-request",
        sandbox: config.mode === "provider-crash" ? "read-only" : "workspace-write" } } } }]
  };
}
