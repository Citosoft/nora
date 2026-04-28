import type { AgentDefinition, AgentSkillCatalogConfig } from "./types/internal.types";

export const SHARED_AGENT_SKILLS_TOOL_ID = "shared-agent-skills";
const CURSOR_INSTALL_TEMPLATE =
  process.platform === "win32"
    ? "powershell -NoProfile -ExecutionPolicy Bypass -Command \"irm 'https://cursor.com/install?win32=true' | iex\""
    : "curl https://cursor.com/install -fsS | bash";
const CURSOR_WINDOWS_ROOT = "%LOCALAPPDATA%\\cursor-agent";

const SHARED_AGENT_SKILLS_CONFIG: AgentSkillCatalogConfig = {
  rootDir: "~/.agents/skills",
  entryFileName: "SKILL.md",
  sourceLabel: "Shared agent skills",
  installHint: "skills add --global installs into ~/.agents/skills. These shared skills are available across supported agent environments."
};

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: "codex",
    label: "Codex",
    aliases: ["codex"],
    launchCommand: "codex --no-alt-screen",
    installTemplate: "npm install -g @openai/codex",
    description: "OpenAI coding agent CLI",
    usageNotes: [
      "Launches Codex inside a Nora-managed worktree for coding tasks.",
      "Set an OpenAI API key if the CLI is not already authenticated on this machine."
    ],
    authFields: [],
    skillCatalog: {
      rootDir: "skills",
      entryFileName: "SKILL.md",
      sourceLabel: "Codex global skills",
      installHint: "Codex-specific skills are loaded from $CODEX_HOME/skills."
    }
  },
  {
    id: "claude",
    label: "Claude Code",
    aliases: ["claude", "claude-code"],
    launchCommand: "claude",
    installTemplate: "npm install -g @anthropic-ai/claude-code",
    description: "Anthropic coding workflow CLI",
    usageNotes: [
      "Runs Claude Code from the selected repository worktree.",
      "Provide an Anthropic API key if the CLI needs direct API authentication."
    ],
    authFields: [],
    skillCatalog: {
      rootDir: "~/.claude/skills",
      entryFileName: "SKILL.md",
      sourceLabel: "Claude Code skills",
      installHint: "Claude Code-specific skills are loaded from ~/.claude/skills."
    }
  },
  {
    id: "gemini",
    label: "Gemini CLI",
    aliases: ["gemini"],
    launchCommand: "gemini",
    installTemplate: "npm install -g @google/gemini-cli",
    description: "Google Gemini terminal agent",
    usageNotes: [
      "Runs Gemini CLI inside the active repository workspace.",
      "Set a Google AI key if Gemini CLI is not authenticated already."
    ],
    authFields: [],
    skillCatalog: null
  },
  {
    id: "cursor",
    label: "Cursor Agent",
    aliases: process.platform === "win32" ? ["cursor-agent.cmd", "cursor-agent", "agent.cmd", "agent"] : ["cursor-agent"],
    launchCommand: process.platform === "win32" ? `"${CURSOR_WINDOWS_ROOT}\\cursor-agent.cmd"` : "cursor-agent",
    installTemplate: CURSOR_INSTALL_TEMPLATE,
    description: "Cursor agent shell entrypoint",
    usageNotes: [
      "Launches the Cursor agent entrypoint inside the current worktree.",
      "Authentication is usually managed by the local Cursor installation."
    ],
    authFields: [],
    windowsKnownPaths: [
      `${CURSOR_WINDOWS_ROOT}\\cursor-agent.cmd`,
      `${CURSOR_WINDOWS_ROOT}\\agent.cmd`
    ],
    windowsLaunchCommand: `"${CURSOR_WINDOWS_ROOT}\\cursor-agent.cmd"`,
    skillCatalog: null
  }
];

export function getDefaultToolCommand(tool: Pick<AgentDefinition, "installTemplate">, action: "install" | "remove"): string {
  const installTemplate = tool.installTemplate.trim();
  if (!installTemplate) {
    return "";
  }

  if (action === "install") {
    return installTemplate;
  }

  if (installTemplate.startsWith("npm install -g ")) {
    return installTemplate.replace("npm install -g ", "npm uninstall -g ");
  }

  return "";
}

export function getAgentSkillCatalogConfig(
  toolId: string
): AgentSkillCatalogConfig | null {
  return AGENT_DEFINITIONS.find((tool) => tool.id === toolId)?.skillCatalog || null;
}

export function getSharedAgentSkillCatalogConfig(): AgentSkillCatalogConfig {
  return SHARED_AGENT_SKILLS_CONFIG;
}

export type { AgentSkillCatalogConfig } from "./types/internal.types";
