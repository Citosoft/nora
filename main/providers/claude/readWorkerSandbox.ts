import type { SandboxSettings } from "@anthropic-ai/claude-agent-sdk";

/** The runtime enforces filesystem access for every command and subprocess, rather than guessing from its name. */
export function readWorkerSandbox(cwd: string): SandboxSettings {
  return {
    enabled: true,
    failIfUnavailable: true,
    autoAllowBashIfSandboxed: true,
    allowUnsandboxedCommands: false,
    excludedCommands: [],
    enableWeakerNestedSandbox: false,
    allowNestedUserNamespaces: false,
    enableWeakerNetworkIsolation: false,
    allowAppleEvents: false,
    filesystem: { disabled: false, denyWrite: [cwd], allowWrite: [] },
    network: { strictAllowlist: true, allowedDomains: [], allowAllUnixSockets: false, allowLocalBinding: false }
  };
}
