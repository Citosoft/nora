import { noraToolingManagementClient } from "@/components/app/clients/noraToolingManagementClient";
import { noraTerminalClient } from "@/components/app/clients/noraTerminalClient";
import { formatDependencyLabel, getMissingInstallDependencies } from "@/components/app/logic/toolInstallDependencies";
import { createToolInstallTerminalPayload } from "@/components/app/logic/toolInstallTerminal";
import type {
  UseAppToolInstallFlowsArgs,
  UseAppToolInstallFlowsResult
} from "@/components/app/types/appToolInstallFlows.types";
import { withAgentToolEnabled } from "@shared/agentToolState";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useCallback, useEffect, useRef, useState } from "react";

type PendingFooterInstall = {
  toolId: string;
  toolLabel: string;
};

export function useAppToolInstallFlows({
  windowPlatform,
  installCommandDrafts,
  setUiState,
  effectiveStartupDependencyReport,
  openStartupDependenciesDialog,
  safely,
  runWithStatus,
  setActiveView,
  showToast,
  captureError
}: UseAppToolInstallFlowsArgs): UseAppToolInstallFlowsResult {
  const snapshot = useCanonicalAppSnapshot();
  const pendingFooterInstallTerminalsRef = useRef<Record<string, PendingFooterInstall>>({});
  const pendingFooterInstallDebugCountsRef = useRef<Record<string, number>>({});
  const [isRefreshingOnboardingTools, setIsRefreshingOnboardingTools] = useState(false);

  const resolveInstallCommand = useCallback((toolId: string, installTemplate: string): string => {
    const draft = installCommandDrafts[toolId]?.trim() || "";
    if (!draft) {
      return installTemplate;
    }

    if (
      toolId === "cursor"
      && windowPlatform === "win32"
      && !draft.includes("win32=true")
    ) {
      return installTemplate;
    }

    return draft;
  }, [installCommandDrafts, windowPlatform]);

  const refreshOnboardingTools = useCallback(async (): Promise<void> => {
    setIsRefreshingOnboardingTools(true);
    try {
      await safely(() => noraToolingManagementClient.refreshToolCatalog());
    } finally {
      setIsRefreshingOnboardingTools(false);
    }
  }, [safely]);

  const installOnboardingTool = useCallback(async (toolId: string): Promise<void> => {
    const tool = snapshot?.agentCatalog.find((item) => item.id === toolId);
    const installCommand = resolveInstallCommand(toolId, tool?.installTemplate ?? "");
    const missingDependencies = getMissingInstallDependencies(installCommand, effectiveStartupDependencyReport);
    if (missingDependencies.length) {
      const dependencyLabels = missingDependencies.map((dependencyId) => formatDependencyLabel(dependencyId)).join(", ");
      setUiState((current) => ({
        ...current,
        activeErrorMessage: `Install ${dependencyLabels} before installing ${tool?.label || toolId}.`
      }));
      openStartupDependenciesDialog();
      return;
    }

    console.log("[nora] onboarding install requested", {
      toolId,
      installCommand,
      toolDetected: tool?.detected ?? null,
      toolInstallStatus: tool?.installStatus ?? null
    });
    await safely(() =>
      noraToolingManagementClient.installManagedTool({
        toolId,
        action: "install",
        installCommand
      })
    );
    console.log("[nora] onboarding install request finished", {
      toolId
    });
  }, [effectiveStartupDependencyReport, openStartupDependenciesDialog, resolveInstallCommand, safely, setUiState, snapshot?.agentCatalog]);

  const installStatusBarTool = useCallback(async (toolId: string): Promise<void> => {
    const tool = snapshot?.agentCatalog.find((item) => item.id === toolId);
    const installCommand = resolveInstallCommand(toolId, tool?.installTemplate ?? "");
    const missingDependencies = getMissingInstallDependencies(installCommand, effectiveStartupDependencyReport);
    if (missingDependencies.length) {
      const dependencyLabels = missingDependencies.map((dependencyId) => formatDependencyLabel(dependencyId)).join(", ");
      setUiState((current) => ({
        ...current,
        activeErrorMessage: `Install ${dependencyLabels} before installing ${tool?.label || toolId}.`
      }));
      openStartupDependenciesDialog();
      return;
    }
    if (!snapshot?.project) {
      setUiState((current) => ({
        ...current,
        activeErrorMessage: "Open a workspace before launching an install terminal from the footer."
      }));
      return;
    }

    setActiveView("main");
    const payload = createToolInstallTerminalPayload(tool?.label || toolId, installCommand, windowPlatform);
    const previousTerminalIds = new Set(snapshot?.terminals.map((terminal) => terminal.id) ?? []);
    const next = await runWithStatus("Opening install terminal", () => noraTerminalClient.createTerminal(payload));
    const createdTerminal =
      next?.terminals.find((terminal) =>
        !previousTerminalIds.has(terminal.id)
        && terminal.launchConfig.kind === "script"
        && terminal.launchConfig.command === payload.launchConfig.command
      )
      || (next?.focusedTerminalId
        ? next.terminals.find((terminal) => terminal.id === next.focusedTerminalId) ?? null
        : null);

    if (createdTerminal?.launchConfig.kind === "script") {
      pendingFooterInstallTerminalsRef.current[createdTerminal.id] = {
        toolId,
        toolLabel: tool?.label || toolId
      };
      console.log("[nora renderer] footer install tracking registered", {
        toolId,
        toolLabel: tool?.label || toolId,
        terminalId: createdTerminal.id
      });
      showToast({
        title: `Install started: ${tool?.label || toolId}`,
        description: "Running in a terminal tab. Nora will refresh tool status when install completes.",
        variant: "info"
      });
    }
  }, [
    effectiveStartupDependencyReport,
    openStartupDependenciesDialog,
    resolveInstallCommand,
    runWithStatus,
    setActiveView,
    setUiState,
    showToast,
    snapshot?.agentCatalog,
    snapshot?.project,
    snapshot?.terminals,
    windowPlatform
  ]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    const completed: Array<{ terminalId: string; success: boolean; install: PendingFooterInstall }> = [];
    for (const [terminalId, install] of Object.entries(pendingFooterInstallTerminalsRef.current)) {
      const terminal = snapshot.terminals.find((entry) => entry.id === terminalId);
      if (!terminal) {
        console.log("[nora renderer] footer install terminal missing from snapshot", {
          terminalId,
          toolId: install.toolId,
          toolLabel: install.toolLabel
        });
        continue;
      }

      const normalizedOutput = terminal.rawTerminalOutput.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "");
      const markerMatch = normalizedOutput.match(/__NORA_INSTALL_EXIT_CODE__:\s*(\d+)/);
      const normalizedLastLine = (terminal.lastTerminalLine || "").replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "");
      const successLineMatch = /\[install finished with code 0\]/i.test(normalizedLastLine);
      const failureLineMatch = /\[install failed with code (\d+)\]/i.exec(normalizedLastLine);
      if (markerMatch) {
        console.log("[nora renderer] footer install completion marker detected", {
          terminalId,
          toolId: install.toolId,
          toolLabel: install.toolLabel,
          exitCode: markerMatch[1]
        });
        completed.push({
          terminalId,
          success: markerMatch[1] === "0",
          install
        });
        continue;
      }
      if (successLineMatch) {
        console.log("[nora renderer] footer install completion inferred from last line", {
          terminalId,
          toolId: install.toolId,
          toolLabel: install.toolLabel,
          lastTerminalLine: normalizedLastLine
        });
        completed.push({
          terminalId,
          success: true,
          install
        });
        continue;
      }
      if (failureLineMatch) {
        console.log("[nora renderer] footer install failure inferred from last line", {
          terminalId,
          toolId: install.toolId,
          toolLabel: install.toolLabel,
          exitCode: failureLineMatch[1],
          lastTerminalLine: normalizedLastLine
        });
        completed.push({
          terminalId,
          success: false,
          install
        });
        continue;
      }

      const debugCount = pendingFooterInstallDebugCountsRef.current[terminalId] ?? 0;
      if (debugCount < 4) {
        pendingFooterInstallDebugCountsRef.current[terminalId] = debugCount + 1;
        console.log("[nora renderer] footer install awaiting completion marker", {
          terminalId,
          toolId: install.toolId,
          toolLabel: install.toolLabel,
          terminalStatus: terminal.status,
          lastTerminalLine: terminal.lastTerminalLine,
          rawTail: normalizedOutput.slice(-260)
        });
      }

      if (terminal.status === "error" || terminal.status === "stopped") {
        console.log("[nora renderer] footer install terminal closed without marker", {
          terminalId,
          toolId: install.toolId,
          toolLabel: install.toolLabel,
          terminalStatus: terminal.status
        });
        completed.push({
          terminalId,
          success: false,
          install
        });
      }
    }

    if (!completed.length) {
      return;
    }

    for (const entry of completed) {
      delete pendingFooterInstallTerminalsRef.current[entry.terminalId];
      delete pendingFooterInstallDebugCountsRef.current[entry.terminalId];
    }

    void safely(() => noraToolingManagementClient.refreshToolCatalog());
    for (const entry of completed) {
      if (entry.success) {
        showToast({
          title: `Install finished: ${entry.install.toolLabel}`,
          description: "CLI status has been refreshed.",
          variant: "success"
        });
      } else {
        showToast({
          title: `Install failed: ${entry.install.toolLabel}`,
          description: "See the terminal tab output for details.",
          variant: "error"
        });
      }
    }
  }, [safely, showToast, snapshot]);

  const switchStatusBarToolAccount = useCallback(async (toolId: string): Promise<void> => {
    try {
      await noraToolingManagementClient.switchManagedToolAccount(toolId);
    } catch (error: unknown) {
      captureError(error);
      throw error;
    }
    await safely(() => noraToolingManagementClient.refreshToolCatalog());
  }, [captureError, safely]);

  const setOnboardingToolEnabled = useCallback(async (toolId: string, enabled: boolean): Promise<void> => {
    const tool = snapshot?.agentCatalog.find((item) => item.id === toolId);
    if (!tool) {
      return;
    }

    await safely(() =>
      noraToolingManagementClient.saveManagedToolConfig({
        toolId,
        values: withAgentToolEnabled(tool.config.values, enabled)
      })
    );
  }, [safely, snapshot?.agentCatalog]);

  return {
    isRefreshingOnboardingTools,
    resolveInstallCommand,
    refreshOnboardingTools,
    installOnboardingTool,
    installStatusBarTool,
    switchStatusBarToolAccount,
    setOnboardingToolEnabled
  };
}
