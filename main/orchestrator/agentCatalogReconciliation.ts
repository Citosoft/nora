import type { AgentCatalogReconciliationDeps } from "../types/orchestratorAgentCatalogReconciliation.types";

export async function reconcileWorkspaceAgentsAfterCatalogRefresh(
  deps: AgentCatalogReconciliationDeps
): Promise<void> {
  const state = deps.getSnapshot();
  if (state.screen !== "workspace" || !state.project || state.project.location?.kind === "ssh") {
    return;
  }

  for (const agent of state.agents) {
    const tool = state.agentCatalog.find((item) => item.id === agent.toolId);
    if (!tool?.detected || !tool.enabled) {
      if (agent.status !== "error" && !deps.hasRuntimeSession(agent.id)) {
        deps.updateAgent(agent.id, {
          status: "error",
          lastEventAt: deps.nowIso()
        });
      }
      continue;
    }

    if (deps.hasRuntimeSession(agent.id)) {
      continue;
    }

    if (agent.status !== "starting" && agent.status !== "error") {
      continue;
    }

    const launchCommand = deps.normalizeAgentLaunchCommand(
      agent.toolId,
      deps.buildResumeCommand(agent) || agent.command
    );
    await deps.resetAgentTranscript(agent);
    deps.updateAgent(agent.id, {
      status: "starting",
      rawTerminalOutput: "",
      lastTerminalLine: launchCommand === agent.command
        ? `Launching ${agent.toolLabel}`
        : `Resuming ${agent.toolLabel}`,
      lastEventAt: deps.nowIso()
    });

    void deps.spawnAgentPty(
      agent.id,
      launchCommand,
      deps.getWorktreeTarget(state.project, { path: agent.workspace, location: state.project.location }),
      deps.getToolEnv(agent.toolId)
    );
  }
}
