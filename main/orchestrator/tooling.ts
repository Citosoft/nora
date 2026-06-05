import type { AgentSkillInstallOutputEvent, AppState, InstallAgentSkillPayload, InstallToolPayload, RemoveAgentSkillPayload, SaveToolConfigPayload } from "@shared/appTypes";
import type { AgentDetectionInfo } from "@shared/appTypes";
import { spawn as spawnChild } from "node:child_process";
import os from "node:os";
import { buildProcessEnv } from "../processEnv";
import type { RefreshCatalogOptions } from "../types/agentDetectionCache.types";
import type { ToolAccountSwitchCommand, ToolingHelperDeps, ToolingHelpers } from "../types/orchestratorTooling.types";

function escapeToolCommand(toolCommand: string): string {
  return /\s/.test(toolCommand) ? `"${toolCommand}"` : toolCommand;
}

export function createToolingHelpers(deps: ToolingHelperDeps): ToolingHelpers {
  const TOOL_ACCOUNT_SWITCH_COMMANDS: Record<string, ToolAccountSwitchCommand | null> = {
    codex: {
      buildExecution: (toolCommand, getShellExecution) => ({
        ...getShellExecution(`${escapeToolCommand(toolCommand)} logout && ${escapeToolCommand(toolCommand)} login`),
        waitForExit: true
      })
    },
    claude: {
      buildExecution: (toolCommand) => ({
        executable: toolCommand,
        args: ["auth", "login", "--claudeai"],
        shell: process.platform === "win32",
        waitForExit: false
      })
    },
    gemini: null,
    cursor: {
      buildExecution: (toolCommand, getShellExecution) => ({
        ...getShellExecution(`${escapeToolCommand(toolCommand)} logout && ${escapeToolCommand(toolCommand)} login`),
        waitForExit: true
      })
    }
  };

  async function resolveDetections(force = false): Promise<AgentDetectionInfo[]> {
    const state = deps.getSnapshot();
    const remoteProject = state.project?.location?.kind === "ssh" ? state.project : null;
    if (remoteProject) {
      return deps.detectRemoteAgentCatalog(deps.getProjectTarget(remoteProject));
    }

    return deps.resolveLocalAgentCatalogDetections({ force });
  }

  async function applyCatalogFromDetections(detections: AgentDetectionInfo[]): Promise<void> {
    const state = deps.getSnapshot();
    const remoteProject = state.project?.location?.kind === "ssh" ? state.project : null;
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

    await deps.reconcileWorkspaceAgentsAfterCatalogRefresh();
  }

  async function refreshCatalog(options: RefreshCatalogOptions = {}): Promise<AppState> {
    const force = options.force ?? false;
    const awaitDetection = options.awaitDetection ?? true;
    const awaitWorkspaceSummaries = options.awaitWorkspaceSummaries ?? awaitDetection;

    if (force) {
      deps.invalidateLocalAgentDetectionCache();
    }

    const finishRefresh = async (detections: AgentDetectionInfo[]): Promise<void> => {
      await applyCatalogFromDetections(detections);
      if (awaitWorkspaceSummaries) {
        await deps.refreshWorkspaceSummaries("refreshCatalog");
      } else {
        void deps.refreshWorkspaceSummaries("refreshCatalog");
      }
    };

    if (!awaitDetection) {
      const cachedDetections = deps.peekLocalAgentCatalogDetections();
      if (cachedDetections) {
        await finishRefresh(cachedDetections);
        return deps.getSnapshot();
      }

      void resolveDetections(force)
        .then(finishRefresh)
        .catch((error: unknown) => {
          console.error("[nora main] background catalog refresh failed", error);
        });
      return deps.getSnapshot();
    }

    const detections = await resolveDetections(force);
    await finishRefresh(detections);
    return deps.getSnapshot();
  }

  function scheduleCatalogRefresh(): void {
    void refreshCatalog({
      awaitDetection: false,
      awaitWorkspaceSummaries: false
    });
  }

  async function refreshCatalogAfterInstall(toolId: string): Promise<AppState> {
    try {
      return await refreshCatalog({ force: true, awaitDetection: true, awaitWorkspaceSummaries: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      deps.updateCatalogTool(toolId, {
        installStatus: "error",
        installLog: [...(deps.getSnapshot().agentCatalog.find((item) => item.id === toolId)?.installLog || []), `[refresh error] ${message}`]
          .slice(-deps.maxInstallLogLines)
      });
      return deps.getSnapshot();
    }
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

    return new Promise<AppState>((resolve, reject) => {
      let settled = false;
      const finish = (action: () => Promise<AppState>): void => {
        if (settled) {
          return;
        }
        settled = true;
        void action().then(resolve, reject);
      };

      child.on("error", (error: Error) => {
        finish(async () => {
          appendLog(`\n[${payload.action} error] ${error.message}\n`);
          deps.updateCatalogTool(tool.id, {
            installStatus: "error"
          });
          deps.deleteInstallSession(tool.id);
          return deps.getSnapshot();
        });
      });

      child.on("exit", (code: number | null) => {
        finish(async () => {
          deps.updateCatalogTool(tool.id, {
            installStatus: code === 0 ? "installed" : "error"
          });
          deps.deleteInstallSession(tool.id);
          return refreshCatalogAfterInstall(tool.id);
        });
      });
    });
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
    return refreshCatalog({ force: false, awaitDetection: true, awaitWorkspaceSummaries: true });
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
    if (!tool.supportsUsageStatus) {
      console.log("[nora main] getToolUsage skipped", {
        toolId,
        reason: "unsupported"
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
    if (!tool.supportsAccountSwitch) {
      throw new Error(`${tool.label} does not support account switching from Nora.`);
    }

    const command = TOOL_ACCOUNT_SWITCH_COMMANDS[toolId] ?? null;
    if (!command) {
      throw new Error(`Account switching is not configured for ${tool.label}.`);
    }

    const execution = command.buildExecution(tool.detectedCommand || tool.id, deps.getInstallCommandExecution);
    await new Promise<void>((resolve, reject) => {
      const child = spawnChild(execution.executable, execution.args, {
        cwd: os.homedir(),
        env: buildProcessEnv(process.env, tool.config.values),
        shell: execution.shell ?? false,
        stdio: ["ignore", "pipe", "pipe"]
      });

      let output = "";
      const appendOutput = (chunk: Buffer): void => {
        output += chunk.toString();
      };

      child.stdout.on("data", appendOutput);
      child.stderr.on("data", appendOutput);

      let settled = false;
      const cleanup = (): void => {
        child.stdout.off("data", appendOutput);
        child.stderr.off("data", appendOutput);
        child.off("error", onError);
        child.off("exit", onExit);
      };
      const settle = (callback: () => void): void => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        cleanup();
        callback();
      };

      const timeout = setTimeout(() => {
        child.kill();
        settle(() => reject(new Error(`Timed out waiting for ${tool.label} account switch.`)));
      }, 120_000);

      const onError = (error: Error): void => {
        settle(() => reject(error));
      };
      const onExit = (code: number | null): void => {
        if (code === 0) {
          settle(resolve);
          return;
        }

        const trimmedOutput = output.trim();
        settle(() => reject(new Error(trimmedOutput || `${tool.label} account switch failed with exit code ${code ?? "unknown"}.`)));
      };

      child.on("error", onError);
      child.on("exit", onExit);
      child.on("spawn", () => {
        if (!execution.waitForExit) {
          child.unref();
          settle(resolve);
        }
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
    scheduleCatalogRefresh,
    installAgentTool,
    installToolSkill,
    removeToolSkill,
    saveToolConfig,
    getToolUsage,
    switchToolAccount,
    searchToolSkills
  };
}
