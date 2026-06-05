import type { BrowserTabState } from "@/components/app/types";
import type {
  AgentCatalogEntry,
  AgentSession,
  TerminalSession,
  TerminalShellOption,
  WorkspaceScriptLauncher,
  WorkspaceSummary
} from "@shared/appTypes";

export const getWorkspaceContextSignature = (workspace: WorkspaceSummary | null): string => {
  if (!workspace) {
    return "";
  }

  const project = workspace.project;
  const framework = project.framework;
  const location = project.location;
  const agents = workspace.agents
    .map((agent) =>
      [
        agent.id,
        agent.sessionId,
        agent.name,
        agent.status,
        agent.mode,
        agent.toolId,
        agent.toolLabel,
        agent.workspace,
        agent.branch,
        String(agent.pid ?? "")
      ].join("|")
    )
    .join("\n");
  const terminals = workspace.terminals
    .map((terminal) =>
      [
        terminal.id,
        terminal.sessionId,
        terminal.name,
        terminal.status,
        terminal.shellId,
        terminal.shellLabel,
        terminal.workspace,
        terminal.currentWorkingDirectory ?? "",
        terminal.branch,
        String(terminal.pid ?? ""),
        String(terminal.detectedLocalPort ?? ""),
        terminal.detectedLocalUrl ?? ""
      ].join("|")
    )
    .join("\n");

  return [
    project.id,
    project.name,
    project.rootPath,
    project.baseBranch,
    framework?.label ?? "",
    framework?.version ?? "",
    framework?.logoUrl ?? "",
    location?.kind ?? "",
    location?.kind === "ssh" ? location.user : "",
    location?.kind === "ssh" ? location.host : "",
    location?.kind === "ssh" ? String(location.port ?? "") : "",
    agents,
    terminals
  ].join("\n");
};

export const getTerminalShellsSignature = (shells: TerminalShellOption[]): string =>
  shells.map((shell) => `${shell.id}|${shell.label}|${shell.executable}`).join("\n");

export const getProjectScriptsSignature = (scripts: WorkspaceScriptLauncher[]): string =>
  scripts.map((script) => `${script.id}|${script.packageManager}|${script.scriptName}|${script.label}|${script.command}`).join("\n");

export const getToolsSignature = (tools: AgentCatalogEntry[]): string =>
  tools.map((tool) =>
    [
      tool.id,
      tool.label,
      tool.detected ? "1" : "0",
      tool.enabled ? "1" : "0",
      tool.installStatus,
      tool.supportsUsageStatus ? "1" : "0",
      tool.usageDashboardUrl ?? "",
      tool.supportsAccountSwitch ? "1" : "0"
    ].join("|")
  ).join("\n");

export const getBrowserTabsSignature = (tabs: BrowserTabState[]): string =>
  tabs.map((tab) => `${tab.id}|${tab.projectId}|${tab.title}|${tab.status}|${tab.historyIndex}|${tab.history[tab.historyIndex] ?? ""}`).join("\n");

export const getAgentRenderSignature = (agent: AgentSession | null): string => {
  if (!agent) {
    return "";
  }
  return [
    agent.id,
    agent.name,
    agent.status,
    agent.mode,
    agent.toolId,
    agent.toolLabel,
    agent.workspace,
    agent.branch,
    String(agent.pid ?? ""),
    agent.command
  ].join("\n");
};

export const getTerminalRenderSignature = (terminal: TerminalSession | null): string => {
  if (!terminal) {
    return "";
  }
  return [
    terminal.id,
    terminal.name,
    terminal.status,
    terminal.shellId,
    terminal.shellLabel,
    terminal.workspace,
    terminal.currentWorkingDirectory ?? "",
    terminal.branch,
    String(terminal.pid ?? ""),
    String(terminal.detectedLocalPort ?? ""),
    terminal.detectedLocalUrl ?? "",
    terminal.command
  ].join("\n");
};
