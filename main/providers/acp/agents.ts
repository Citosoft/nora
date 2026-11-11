import type { AcpLaunchSpec } from "@main/types/execution/acp.types";
import type { AcpProviderKind } from "@shared/types/provider/providerKind.types";

/**
 * ACP launch commands per agent, from the official ACP agent registry
 * (cdn.agentclientprotocol.com/registry). Nora launches only what is installed locally; it never downloads agents.
 */
export const ACP_AGENT_LAUNCH: Readonly<Record<AcpProviderKind, AcpLaunchSpec>> = {
  gemini: { args: ["--acp"] },
  pi: { executables: ["pi-acp"], args: [] },
  cursor: { args: ["acp"] },
  goose: { args: ["acp"] },
  qwen: { args: ["--acp", "--experimental-skills"] },
  opencode: { args: ["acp"] },
  antigravity: { executables: ["agy_acp_server", "agy-acp-server"], args: [] },
  grok: { args: ["agent", "stdio"] },
  copilot: { args: ["--acp"] },
  cline: { args: ["--acp"] },
  amp: { executables: ["amp-acp"], args: [] },
  kilo: { args: ["acp"] },
  kiro: { args: ["acp", "--agent-engine=v3"] },
  aug: { args: ["--acp"], env: { AUGMENT_DISABLE_AUTO_UPDATE: "1" } },
  autohand: { args: ["--acp"] },
  droid: { args: ["exec", "--output-format", "acp-daemon"], env: { DROID_DISABLE_AUTO_UPDATE: "true", FACTORY_DROID_AUTO_UPDATE_ENABLED: "false" } },
  kimi: { args: ["acp"] },
  "mistral-vibe": { executables: ["vibe-acp"], args: [] }
};
