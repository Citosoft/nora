import type { AgentSkillInstallOutputEvent, AppState, InstallAgentSkillPayload, InstallToolPayload, RemoveAgentSkillPayload, SaveToolConfigPayload } from "@shared/appTypes";
import { spawn as spawnChild } from "node:child_process";
import os from "node:os";
import { buildProcessEnv } from "../processEnv";
import type { ToolingHelperDeps, ToolingHelpers } from "../types/orchestratorTooling.types";

export function createToolingHelpers(deps: ToolingHelperDeps): ToolingHelpers {
  const TOOL_ACCOUNT_SWITCH_COMMANDS: Record<string, "default" | null> = {
    codex: "default",
    claude: "default",
    gemini: null,
    cursor: "default"
  };

  async function refreshCatalog(): Promise<AppState> {
    const state = deps.getSnapshot();
    const remoteProject = state.project?.location?.kind === "ssh" ? state.project : null;
    const detections = remoteProject
      ? await deps.detectRemoteAgentCatalog(deps.getProjectTarget(remoteProject))
      : await deps.detectLocalAgentCatalog();
    const catalog = deps.buildAgentCatalog(detections, state.agentCatalog, deps.getToolConfigs());
    const agentSkillCatalogs = await deps.readAgentSkillCatalogs([...catalog.map((tool) => tool.id), deps.sharedAgentSkillsToolId]);

    if (remoteProject) {
      const updatedProject = {
        ...remoteProject,
        remoteAgentCatalog: detections,
        updatedAt: deps.nowIso()
      };
      await deps.saveProject(updatedProject);
      deps.updateState((currentState) => ({
        ...currentState,
        project: updatedProject,
        workspaces: currentState.workspaces.map((workspace) =>
          workspace.project.id === updatedProject.id
            ? { ...workspace, project: updatedProject }
            : workspace
        ),
        agentCatalog: catalog,
        agentSkillCatalogs
      }));
    } else {
      deps.updateState((currentState) => ({
        ...currentState,
        agentCatalog: catalog,
        agentSkillCatalogs
      }));
    }

    await deps.refreshWorkspaceSummaries("refreshCatalog");
    return deps.getSnapshot();
  }

  async function installAgentTool(payload: InstallToolPayload): Promise<AppState> {
    const state = deps.getSnapshot();
    const tool = state.agentCatalog.find((item) => item.id === payload.toolId);
    if (!tool) {
      throw new Error(`Unknown agent tool: ${payload.toolId}`);
    }

    const command = (payload.installCommand || deps.getDefaultToolCommand(tool, payload.action) || "").trim();
    const installExecution = deps.getInstallCommandExecution(command);
    if (!command) {
      throw new Error(`No ${payload.action} command provided for ${tool.label}.`);
    }
    if (deps.hasInstallSession(tool.id)) {
      throw new Error(`${tool.label} ${payload.action} is already running.`);
    }

    deps.updateCatalogTool(tool.id, {
      installStatus: "running",
      installLog: [`$ ${command}`]
    });

    const child = spawnChild(installExecution.executable, installExecution.args, {
      cwd: os.homedir(),
      env: buildProcessEnv(process.env),
      stdio: "pipe"
    });

    deps.setInstallSession(tool.id, child);

    const appendLog = (chunk: string): void => {
      deps.updateState((currentState) => ({
        ...currentState,
        agentCatalog: currentState.agentCatalog.map((item) => {
          if (item.id !== tool.id) {
            return item;
          }
          const nextLog = `${item.installLog.join("\n")}${chunk}`.split("\n");
          return {
            ...item,
            installLog: nextLog.slice(-deps.maxInstallLogLines),
            installStatus: "running"
          };
        })
      }));
    };

    child.stdout.on("data", (chunk: Buffer) => appendLog(chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => appendLog(chunk.toString()));

    child.on("error", (error: Error) => {
      appendLog(`\n[${payload.action} error] ${error.message}\n`);
      deps.updateCatalogTool(tool.id, {
        installStatus: "error"
      });
      deps.deleteInstallSession(tool.id);
    });

    child.on("exit", (code: number | null) => {
      deps.updateCatalogTool(tool.id, {
        installStatus: code === 0 ? "installed" : "error"
      });
      deps.deleteInstallSession(tool.id);
      void deps.refreshCatalog().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Unknown error";
        deps.updateCatalogTool(tool.id, {
          installStatus: "error",
          installLog: [...(deps.getSnapshot().agentCatalog.find((item) => item.id === tool.id)?.installLog || []), `[refresh error] ${message}`]
            .slice(-deps.maxInstallLogLines)
        });
      });
    });

    return deps.getSnapshot();
  }

  async function installToolSkill(
    payload: InstallAgentSkillPayload,
    onOutput?: (event: Omit<AgentSkillInstallOutputEvent, "toolId">) => void
  ): Promise<AppState> {
    const state = deps.getSnapshot();
    const tool = state.agentCatalog.find((item) => item.id === payload.toolId);
    const skillCatalog = state.agentSkillCatalogs.find((catalog) => catalog.toolId === payload.toolId);
    if (!tool && !skillCatalog?.supported) {
      throw new Error(`Unknown agent tool: ${payload.toolId}`);
    }

    const nextCatalog = await deps.installAgentSkill(payload.toolId, payload.skillReference, onOutput);
    deps.updateAgentSkillCatalog(nextCatalog);
    return deps.getSnapshot();
  }

  async function removeToolSkill(payload: RemoveAgentSkillPayload): Promise<AppState> {
    const state = deps.getSnapshot();
    const tool = state.agentCatalog.find((item) => item.id === payload.toolId);
    const skillCatalog = state.agentSkillCatalogs.find((catalog) => catalog.toolId === payload.toolId);
    if (!tool && !skillCatalog?.supported) {
      throw new Error(`Unknown agent tool: ${payload.toolId}`);
    }

    const nextCatalog = await deps.removeAgentSkill(payload.toolId, payload.skillId);
    deps.updateAgentSkillCatalog(nextCatalog);
    return deps.getSnapshot();
  }

  async function saveToolConfig(payload: SaveToolConfigPayload): Promise<AppState> {
    const state = deps.getSnapshot();
    const tool = state.agentCatalog.find((item) => item.id === payload.toolId);
    if (!tool) {
      throw new Error(`Unknown agent tool: ${payload.toolId}`);
    }

    const values = Object.fromEntries(
      Object.entries(payload.values).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value.length > 0)
    );

    const nextConfigs = await deps.saveToolConfigStore(payload.toolId, values);
    deps.setToolConfigs(nextConfigs);
    return deps.refreshCatalog();
  }

  async function getToolUsage(toolId: string) {
    const tool = deps.getSnapshot().agentCatalog.find((item) => item.id === toolId);
    console.log("[nora main] getToolUsage requested", {
      toolId,
      detected: tool?.detected ?? false
    });
    if (!tool || !tool.detected) {
      console.log("[nora main] getToolUsage skipped", {
        toolId,
        reason: !tool ? "unknown-tool" : "not-detected"
      });
      return null;
    }

    const result = await deps.getCliToolStatus(tool);
    console.log("[nora main] getToolUsage resolved", {
      toolId,
      status: result?.status ?? null,
      title: result?.title ?? null,
      lineCount: result?.lines.length ?? 0
    });
    return result;
  }

  async function switchToolAccount(toolId: string): Promise<void> {
    const tool = deps.getSnapshot().agentCatalog.find((item) => item.id === toolId);
    if (!tool || !tool.detected) {
      throw new Error("Install this CLI before switching accounts.");
    }

    const command = TOOL_ACCOUNT_SWITCH_COMMANDS[toolId] ?? null;
    if (!command) {
      throw new Error(`Account switching is not configured for ${tool.label}.`);
    }

    const toolCommand = tool.detectedCommand || tool.id;
    const escapedToolCommand = /\s/.test(toolCommand) ? `"${toolCommand}"` : toolCommand;
    const accountCommand = `${escapedToolCommand} logout && ${escapedToolCommand} login`;

    const execution = deps.getInstallCommandExecution(accountCommand);
    await new Promise<void>((resolve, reject) => {
      const child = spawnChild(execution.executable, execution.args, {
        cwd: os.homedir(),
        env: buildProcessEnv(process.env, tool.config.values),
        stdio: "pipe"
      });

      let output = "";
      const appendOutput = (chunk: Buffer): void => {
        output += chunk.toString();
      };

      child.stdout.on("data", appendOutput);
      child.stderr.on("data", appendOutput);

      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error(`Timed out waiting for ${tool.label} account switch.`));
      }, 120_000);

      child.on("error", (error: Error) => {
        clearTimeout(timeout);
        reject(error);
      });

      child.on("exit", (code: number | null) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve();
          return;
        }

        const trimmedOutput = output.trim();
        reject(new Error(trimmedOutput || `${tool.label} account switch failed with exit code ${code ?? "unknown"}.`));
      });
    });
  }

  async function searchToolSkills(toolId: string, query: string) {
    const tool = deps.getSnapshot().agentCatalog.find((item) => item.id === toolId);
    const skillCatalog = deps.getSnapshot().agentSkillCatalogs.find((catalog) => catalog.toolId === toolId);
    if (!tool && !skillCatalog?.supported) {
      throw new Error(`Unknown agent tool: ${toolId}`);
    }

    return deps.searchAgentSkills(toolId, query);
  }

  return {
    refreshCatalog,
    installAgentTool,
    installToolSkill,
    removeToolSkill,
    saveToolConfig,
    getToolUsage,
    switchToolAccount,
    searchToolSkills
  };
}
