import type { AgentDefinition, AgentExecutablePathCandidate, AgentSkillCatalogConfig } from "./types/internal.types";

export const SHARED_AGENT_SKILLS_TOOL_ID = "shared-agent-skills";
const INSTALL_SCRIPT_SHELL = "curl -fsSL";
const CURSOR_INSTALL_TEMPLATE =
  process.platform === "win32"
    ? "powershell -NoProfile -ExecutionPolicy Bypass -Command \"irm 'https://cursor.com/install?win32=true' | iex\""
    : "curl https://cursor.com/install -fsS | bash";
const CURSOR_WINDOWS_ROOT = "%LOCALAPPDATA%\\cursor-agent";
const AIDER_INSTALL_TEMPLATE =
  process.platform === "win32"
    ? "powershell -ExecutionPolicy ByPass -c \"irm https://aider.chat/install.ps1 | iex\""
    : `${INSTALL_SCRIPT_SHELL} https://aider.chat/install.sh | sh`;
const AMP_INSTALL_TEMPLATE =
  process.platform === "win32"
    ? "powershell -c \"irm https://ampcode.com/install.ps1 | iex\""
    : `${INSTALL_SCRIPT_SHELL} https://ampcode.com/install.sh | bash`;
const CONTINUE_INSTALL_TEMPLATE =
  process.platform === "win32"
    ? "powershell -NoProfile -ExecutionPolicy Bypass -Command \"irm https://raw.githubusercontent.com/continuedev/continue/main/extensions/cli/scripts/install.ps1 | iex\""
    : `${INSTALL_SCRIPT_SHELL} https://raw.githubusercontent.com/continuedev/continue/main/extensions/cli/scripts/install.sh | bash`;
const GOOSE_INSTALL_TEMPLATE =
  process.platform === "win32"
    ? "powershell -NoProfile -ExecutionPolicy Bypass -Command \"Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/aaif-goose/goose/main/download_cli.ps1' -OutFile 'download_cli.ps1'; .\\download_cli.ps1\""
    : `${INSTALL_SCRIPT_SHELL} https://github.com/aaif-goose/goose/releases/download/stable/download_cli.sh | bash`;
const GROK_INSTALL_TEMPLATE = `${INSTALL_SCRIPT_SHELL} https://x.ai/cli/install.sh | bash`;
const OPENCODE_INSTALL_TEMPLATE =
  process.platform === "win32"
    ? "npm install -g opencode-ai"
    : `${INSTALL_SCRIPT_SHELL} https://opencode.ai/install | bash`;
const QWEN_INSTALL_TEMPLATE =
  process.platform === "win32"
    ? "powershell -Command \"Invoke-WebRequest 'https://qwen-code-assets.oss-cn-hangzhou.aliyuncs.com/installation/install-qwen.bat' -OutFile (Join-Path $env:TEMP 'install-qwen.bat'); & (Join-Path $env:TEMP 'install-qwen.bat')\""
    : `${INSTALL_SCRIPT_SHELL} https://qwen-code-assets.oss-cn-hangzhou.aliyuncs.com/installation/install-qwen.sh | bash`;

type AgentDefinitionInput = Omit<AgentDefinition, "usageNotes" | "authFields" | "skillCatalog" | "executablePathCandidates" | "supportsUsageStatus" | "usageDashboardUrl" | "supportsAccountSwitch"> & {
  usageNotes?: string[];
  authFields?: AgentDefinition["authFields"];
  skillCatalog?: AgentDefinition["skillCatalog"];
  executablePathCandidates?: AgentExecutablePathCandidate[];
  supportsUsageStatus?: boolean;
  usageDashboardUrl?: string | null;
  supportsAccountSwitch?: boolean;
};

const POSIX_PLATFORMS: NodeJS.Platform[] = ["darwin", "linux"];

function withoutWindowsCommandExtension(alias: string): string {
  return alias.replace(/\.(cmd|exe)$/i, "");
}

function standardExecutablePathCandidates(aliases: string[]): AgentExecutablePathCandidate[] {
  return aliases.flatMap((alias) => {
    const windowsAlias = withoutWindowsCommandExtension(alias);
    return [
      { path: `%APPDATA%\\npm\\${windowsAlias}.cmd`, platforms: ["win32"] },
      { path: `%APPDATA%\\npm\\${windowsAlias}.exe`, platforms: ["win32"] },
      { path: `/opt/homebrew/bin/${alias}`, platforms: ["darwin"] },
      { path: `/usr/local/bin/${alias}`, platforms: POSIX_PLATFORMS },
      { path: `/usr/bin/${alias}`, platforms: ["linux"] },
      { path: `~/.local/bin/${alias}`, platforms: POSIX_PLATFORMS },
      { path: `~/bin/${alias}`, platforms: POSIX_PLATFORMS }
    ];
  });
}

function agent(input: AgentDefinitionInput): AgentDefinition {
  return {
    ...input,
    usageNotes: input.usageNotes || [],
    authFields: input.authFields || [],
    supportsUsageStatus: input.supportsUsageStatus ?? false,
    usageDashboardUrl: input.usageDashboardUrl ?? null,
    supportsAccountSwitch: input.supportsAccountSwitch ?? false,
    skillCatalog: input.skillCatalog ?? null,
    executablePathCandidates: [
      ...standardExecutablePathCandidates(input.aliases),
      ...(input.executablePathCandidates || [])
    ]
  };
}

function npmAgent(input: Omit<AgentDefinitionInput, "installTemplate"> & { packageName: string }): AgentDefinition {
  return agent({
    ...input,
    installTemplate: `npm install -g ${input.packageName}`
  });
}

const ANTIGRAVITY_INSTALL_TEMPLATE =
  process.platform === "win32"
    ? "powershell -c \"irm https://antigravity.google/cli/install.ps1 | iex\""
    : "curl -fsSL https://antigravity.google/cli/install.sh | bash";
const DROID_INSTALL_TEMPLATE = "curl -fsSL https://app.factory.ai/cli | sh";
const HERMES_INSTALL_TEMPLATE =
  process.platform === "win32"
    ? "powershell -c \"irm https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.ps1 | iex\""
    : "curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash";
const KIMI_INSTALL_TEMPLATE =
  process.platform === "win32"
    ? "powershell -c \"irm https://code.kimi.com/kimi-code/install.ps1 | iex\""
    : "curl -fsSL https://code.kimi.com/kimi-code/install.sh | bash";
const KIRO_INSTALL_TEMPLATE =
  process.platform === "win32"
    ? "powershell -c \"irm https://cli.kiro.dev/install.ps1 | iex\""
    : "curl -fsSL https://cli.kiro.dev/install | bash";
const MISTRAL_VIBE_INSTALL_TEMPLATE =
  process.platform === "win32"
    ? "uv tool install mistral-vibe"
    : "curl -LsSf https://mistral.ai/vibe/install.sh | bash";
const OPENCLAW_INSTALL_TEMPLATE =
  process.platform === "win32"
    ? "powershell -c \"irm https://openclaw.ai/install.ps1 | iex\""
    : "curl -fsSL https://openclaw.ai/install.sh | bash";
const ROVO_INSTALL_TEMPLATE =
  process.platform === "win32"
    ? "powershell -Command \"Invoke-WebRequest -Uri https://acli.atlassian.com/windows/latest/acli_windows_amd64/acli.exe -OutFile acli.exe\""
    : process.platform === "darwin"
      ? "brew tap atlassian/homebrew-acli && brew install acli"
      : `bash -lc 'ARCH="$(uname -m)"; if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then URL="https://acli.atlassian.com/linux/latest/acli_linux_arm64/acli"; else URL="https://acli.atlassian.com/linux/latest/acli_linux_amd64/acli"; fi; curl -LO "$URL" && chmod +x ./acli && sudo install -o root -g root -m 0755 acli /usr/local/bin/acli'`;

const SHARED_AGENT_SKILLS_CONFIG: AgentSkillCatalogConfig = {
  rootDir: "~/.agents/skills",
  entryFileName: "SKILL.md",
  sourceLabel: "Shared agent skills",
  installHint: "skills add --global installs into ~/.agents/skills. These shared skills are available across supported agent environments."
};

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  agent({
    id: "codex",
    label: "Codex",
    aliases: ["codex"],
    launchCommand: "codex --no-alt-screen",
    installTemplate: "npm install -g @openai/codex",
    description: "OpenAI coding agent CLI",
    supportsUsageStatus: true,
    supportsAccountSwitch: true,
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
  }),
  npmAgent({
    id: "claude",
    label: "Claude Code",
    aliases: ["claude", "claude-code"],
    launchCommand: "claude",
    packageName: "@anthropic-ai/claude-code",
    description: "Anthropic coding workflow CLI",
    supportsUsageStatus: true,
    supportsAccountSwitch: true,
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
  }),
  npmAgent({
    id: "gemini",
    label: "Gemini CLI",
    aliases: ["gemini"],
    launchCommand: "gemini",
    packageName: "@google/gemini-cli",
    description: "Google Gemini terminal agent",
    usageDashboardUrl: "https://aistudio.google.com/usage",
    usageNotes: [
      "Runs Gemini CLI inside the active repository workspace.",
      "Set a Google AI key if Gemini CLI is not authenticated already."
    ]
  }),
  npmAgent({
    id: "pi",
    label: "Pi",
    aliases: ["pi"],
    launchCommand: "pi",
    packageName: "@earendil-works/pi-coding-agent",
    description: "Pi coding harness",
    usageNotes: [
      "Runs Pi in the selected worktree.",
      "Install Pi separately and make sure the `pi` command is on PATH."
    ]
  }),
  agent({
    id: "cursor",
    label: "Cursor Agent",
    aliases: process.platform === "win32" ? ["cursor-agent.cmd", "cursor-agent", "agent.cmd", "agent"] : ["cursor-agent"],
    launchCommand: process.platform === "win32" ? `"${CURSOR_WINDOWS_ROOT}\\cursor-agent.cmd"` : "cursor-agent",
    installTemplate: CURSOR_INSTALL_TEMPLATE,
    description: "Cursor agent shell entrypoint",
    usageDashboardUrl: "https://www.cursor.com/dashboard",
    supportsAccountSwitch: true,
    usageNotes: [
      "Launches the Cursor agent entrypoint inside the current worktree.",
      "Authentication is usually managed by the local Cursor installation."
    ],
    authFields: [],
    executablePathCandidates: [
      { path: `${CURSOR_WINDOWS_ROOT}\\cursor-agent.cmd`, platforms: ["win32"] },
      { path: `${CURSOR_WINDOWS_ROOT}\\agent.cmd`, platforms: ["win32"] }
    ],
    windowsLaunchCommand: `"${CURSOR_WINDOWS_ROOT}\\cursor-agent.cmd"`
  }),
  agent({
    id: "aider",
    label: "Aider",
    aliases: ["aider"],
    launchCommand: "aider",
    installTemplate: AIDER_INSTALL_TEMPLATE,
    description: "AI pair programming CLI for terminal-based code edits",
    usageNotes: [
      "Runs Aider in the selected worktree for conversational code changes.",
      "Configure provider API keys through Aider or the relevant environment variables."
    ],
    executablePathCandidates: [
      { path: "~/.local/bin/aider", platforms: ["darwin", "linux"] }
    ]
  }),
  agent({
    id: "goose",
    label: "Goose",
    aliases: ["goose"],
    launchCommand: "goose session",
    installTemplate: GOOSE_INSTALL_TEMPLATE,
    description: "Open source local AI agent CLI from AAIF",
    usageNotes: [
      "Starts a Goose session in the active repository worktree.",
      "Run goose configure if the CLI has not been connected to a model provider yet."
    ]
  }),
  agent({
    id: "qwen",
    label: "Qwen Code",
    aliases: ["qwen", "qwen-code"],
    launchCommand: "qwen-code",
    installTemplate: QWEN_INSTALL_TEMPLATE,
    description: "Qwen Code terminal coding agent",
    usageNotes: [
      "Runs Qwen Code in the selected worktree.",
      "Choose an authentication method on first launch or configure the CLI ahead of time."
    ]
  }),
  agent({
    id: "opencode",
    label: "OpenCode",
    aliases: ["opencode"],
    launchCommand: "opencode",
    installTemplate: OPENCODE_INSTALL_TEMPLATE,
    description: "Open source terminal coding agent",
    usageNotes: [
      "Launches OpenCode's terminal interface in the selected worktree.",
      "Configure model provider credentials in OpenCode before starting larger tasks."
    ],
    executablePathCandidates: [
      { path: "~/.opencode/bin/opencode", platforms: ["darwin", "linux"] }
    ]
  }),
  agent({
    id: "antigravity",
    label: "Antigravity",
    aliases: ["agy", "antigravity"],
    launchCommand: "agy",
    installTemplate: ANTIGRAVITY_INSTALL_TEMPLATE,
    description: "Antigravity CLI coding agent",
    usageNotes: [
      "Runs Antigravity in the selected worktree.",
      "Install Antigravity separately and make sure the `agy` command is on PATH."
    ]
  }),
  agent({
    id: "grok",
    label: "Grok Build",
    aliases: ["grok"],
    launchCommand: "grok",
    installTemplate: GROK_INSTALL_TEMPLATE,
    description: "xAI coding agent CLI",
    usageNotes: [
      "Runs Grok Build in the selected worktree.",
      "Sign in on first launch or set GROK_CODE_XAI_API_KEY for API key authentication."
    ]
  }),
  npmAgent({
    id: "copilot",
    label: "GitHub Copilot CLI",
    aliases: ["copilot"],
    launchCommand: "copilot",
    packageName: "@github/copilot",
    description: "GitHub Copilot coding agent for the command line",
    usageNotes: [
      "Runs Copilot CLI from the active repository worktree.",
      "Requires an active Copilot plan and CLI authentication on first use."
    ]
  }),
  npmAgent({
    id: "cline",
    label: "Cline",
    aliases: ["cline"],
    launchCommand: "cline",
    packageName: "cline",
    description: "Cline terminal coding agent",
    usageNotes: [
      "Runs Cline in the selected worktree.",
      "Install Cline separately and make sure the `cline` command is on PATH."
    ]
  }),
  agent({
    id: "continue",
    label: "Continue CLI",
    aliases: ["cn"],
    launchCommand: "cn",
    installTemplate: CONTINUE_INSTALL_TEMPLATE,
    description: "Continue terminal coding agent",
    usageNotes: [
      "Starts Continue CLI in the selected worktree.",
      "Log in with Continue or configure an API key during first launch."
    ]
  }),
  npmAgent({
    id: "codebuff",
    label: "Codebuff",
    aliases: ["codebuff"],
    launchCommand: "codebuff",
    packageName: "codebuff",
    description: "Codebuff terminal coding agent",
    usageNotes: [
      "Runs Codebuff in the selected worktree.",
      "Install Codebuff separately and make sure the `codebuff` command is on PATH."
    ]
  }),
  agent({
    id: "amp",
    label: "Amp",
    aliases: ["amp"],
    launchCommand: "amp",
    installTemplate: AMP_INSTALL_TEMPLATE,
    description: "Amp terminal coding agent",
    usageNotes: [
      "Runs Amp interactively from the selected worktree.",
      "Sign in to Amp before first use if the CLI is not already authenticated."
    ]
  }),
  npmAgent({
    id: "kilo",
    label: "Kilocode",
    aliases: ["kilo", "kilocode"],
    launchCommand: "kilo",
    packageName: "@kilocode/cli",
    description: "Kilo CLI coding agent",
    usageNotes: [
      "Runs Kilocode in the selected worktree.",
      "Install Kilo Code separately and make sure the `kilo` command is on PATH."
    ]
  }),
  agent({
    id: "kiro",
    label: "Kiro",
    aliases: ["kiro-cli", "kiro"],
    launchCommand: "kiro-cli",
    installTemplate: KIRO_INSTALL_TEMPLATE,
    description: "Kiro CLI coding agent",
    usageNotes: [
      "Runs Kiro in the selected worktree.",
      "Install Kiro separately and make sure the `kiro-cli` command is on PATH."
    ]
  }),
  agent({
    id: "crush",
    label: "Crush",
    aliases: ["crush"],
    launchCommand: "crush",
    installTemplate: "go install github.com/charmbracelet/crush@latest",
    description: "Charm terminal coding agent",
    usageNotes: [
      "Runs Crush in the selected worktree.",
      "Configure a supported provider API key when Crush prompts for one."
    ],
    executablePathCandidates: [
      { path: "~/go/bin/crush", platforms: ["darwin", "linux"] }
    ]
  }),
  npmAgent({
    id: "aug",
    label: "Auggie",
    aliases: ["auggie", "aug"],
    launchCommand: "auggie",
    packageName: "@augmentcode/auggie",
    description: "Auggie CLI coding agent",
    usageNotes: [
      "Runs Auggie in the selected worktree.",
      "Install Auggie separately and make sure the `auggie` command is on PATH."
    ]
  }),
  npmAgent({
    id: "autohand",
    label: "Autohand Code",
    aliases: ["autohand"],
    launchCommand: "autohand",
    packageName: "autohand-cli",
    description: "Autohand Code CLI",
    usageNotes: [
      "Runs Autohand Code in the selected worktree.",
      "Install Autohand Code separately and make sure the `autohand` command is on PATH."
    ]
  }),
  agent({
    id: "droid",
    label: "Droid",
    aliases: ["droid"],
    launchCommand: "droid",
    installTemplate: DROID_INSTALL_TEMPLATE,
    description: "Droid CLI coding agent",
    usageNotes: [
      "Runs Droid in the selected worktree.",
      "Install Droid separately and make sure the `droid` command is on PATH."
    ]
  }),
  agent({
    id: "kimi",
    label: "Kimi",
    aliases: ["kimi"],
    launchCommand: "kimi",
    installTemplate: KIMI_INSTALL_TEMPLATE,
    description: "Kimi CLI coding agent",
    usageNotes: [
      "Runs Kimi in the selected worktree.",
      "Install Kimi separately and make sure the `kimi` command is on PATH."
    ]
  }),
  agent({
    id: "mistral-vibe",
    label: "Mistral Vibe",
    aliases: ["vibe", "mistral-vibe"],
    launchCommand: "vibe",
    installTemplate: MISTRAL_VIBE_INSTALL_TEMPLATE,
    description: "Mistral Vibe CLI coding agent",
    usageNotes: [
      "Runs Mistral Vibe in the selected worktree.",
      "Install Mistral Vibe separately and make sure the `vibe` command is on PATH."
    ]
  }),
  agent({
    id: "rovo",
    label: "Rovo Dev",
    aliases: ["acli", "rovodev", "rovo"],
    launchCommand: "acli rovodev run",
    installTemplate: ROVO_INSTALL_TEMPLATE,
    description: "Rovo Dev CLI coding agent",
    usageNotes: [
      "Runs Rovo Dev in the selected worktree.",
      "Install Atlassian CLI first, then make sure `acli` is on PATH."
    ]
  }),
  agent({
    id: "hermes",
    label: "Hermes",
    aliases: ["hermes"],
    launchCommand: "hermes",
    installTemplate: HERMES_INSTALL_TEMPLATE,
    description: "Hermes CLI coding agent",
    usageNotes: [
      "Runs Hermes in the selected worktree.",
      "Install Hermes separately and make sure the `hermes` command is on PATH."
    ]
  }),
  agent({
    id: "openclaw",
    label: "OpenClaw",
    aliases: ["openclaw"],
    launchCommand: "openclaw",
    installTemplate: OPENCLAW_INSTALL_TEMPLATE,
    description: "OpenClaw CLI coding agent",
    usageNotes: [
      "Runs OpenClaw in the selected worktree.",
      "Install OpenClaw separately and make sure the `openclaw` command is on PATH."
    ]
  })
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
