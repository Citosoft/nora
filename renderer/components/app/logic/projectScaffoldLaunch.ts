import type {
  LaunchProjectScaffoldAgentDeps,
  LaunchProjectScaffoldAgentInput,
  LaunchProjectScaffoldAgentResult
} from "@/components/app/types/projectScaffoldLaunch.types";
import { canPresetAgentInitialPrompt } from "@shared/agentStartupCapabilities";

export async function launchProjectScaffoldAgent(
  input: LaunchProjectScaffoldAgentInput,
  deps: LaunchProjectScaffoldAgentDeps
): Promise<LaunchProjectScaffoldAgentResult> {
  const workspaceResult = await deps.createProjectWorkspace({ projectName: input.projectName });
  deps.updateSnapshot(deps.normalizeSnapshot(workspaceResult.state));

  if (!workspaceResult.projectRoot) {
    return {
      agentId: null,
      projectRoot: null
    };
  }

  const createdSnapshot = deps.normalizeSnapshot(await deps.createAgent(input.payload));
  deps.updateSnapshot(createdSnapshot);

  const agentId = createdSnapshot.focusedAgentId;
  if (!agentId) {
    return {
      agentId: null,
      projectRoot: workspaceResult.projectRoot
    };
  }

  const promptPresetAtLaunch =
    input.payload.initialPromptDelivery === "launch-command" &&
    canPresetAgentInitialPrompt(input.payload.toolId);

  if (!promptPresetAtLaunch) {
    await deps.handoffPrompt({
      agentId,
      prompt: {
        source: input.payload.launchSource ?? "dialog",
        title: "New project scaffold",
        text: input.payload.task,
        workspacePaths: [],
        contextSelections: []
      },
      updateSnapshot: (snapshot) => deps.updateSnapshot(deps.normalizeSnapshot(snapshot))
    });
  }

  return {
    agentId,
    projectRoot: workspaceResult.projectRoot
  };
}
