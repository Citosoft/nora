import type { AppState } from "@shared/appTypes";
import type { LaunchCommand } from "@main/launchCommand";

interface LaunchCommandQueueDeps {
  parseLaunchCommand: (input: { argv: string[]; cwd: string; appRoot: string }) => LaunchCommand | null;
  getAppPath: () => string;
  withSnapshot: (action: () => Promise<AppState>) => Promise<AppState>;
  selectProject: (projectRoot: string) => Promise<AppState>;
  createWorkspaceTask: (projectId: string, content: string) => Promise<AppState>;
  canHandle: () => boolean;
}

export interface LaunchCommandQueueController {
  enqueueParsedLaunchCommand: (argv: string[], cwd: string) => void;
  flushLaunchCommands: () => Promise<void>;
}

export function createLaunchCommandQueueController({
  parseLaunchCommand,
  getAppPath,
  withSnapshot,
  selectProject,
  createWorkspaceTask,
  canHandle
}: LaunchCommandQueueDeps): LaunchCommandQueueController {
  const pendingLaunchCommands: LaunchCommand[] = [];
  let isHandlingLaunchCommands = false;

  const handleLaunchCommand = async (command: LaunchCommand): Promise<void> => {
    const selectedSnapshot = await withSnapshot(() => selectProject(command.projectRoot));
    if (!command.task) {
      return;
    }

    const projectId = selectedSnapshot.project?.id;
    if (!projectId) {
      throw new Error("Unable to determine the active workspace for the requested task.");
    }

    await withSnapshot(() => createWorkspaceTask(projectId, command.task as string));
  };

  const flushLaunchCommands = async (): Promise<void> => {
    if (!canHandle() || isHandlingLaunchCommands || !pendingLaunchCommands.length) {
      return;
    }

    isHandlingLaunchCommands = true;
    try {
      while (pendingLaunchCommands.length) {
        const nextCommand = pendingLaunchCommands.shift();
        if (!nextCommand) {
          continue;
        }
        await handleLaunchCommand(nextCommand);
      }
    } catch (error) {
      console.error("Failed to handle Nora launch command.", error);
    } finally {
      isHandlingLaunchCommands = false;
    }
  };

  const enqueueLaunchCommand = (command: LaunchCommand | null): void => {
    if (!command) {
      return;
    }

    pendingLaunchCommands.push(command);
    void flushLaunchCommands();
  };

  const enqueueParsedLaunchCommand = (argv: string[], cwd: string): void => {
    try {
      enqueueLaunchCommand(
        parseLaunchCommand({
          argv,
          cwd,
          appRoot: getAppPath()
        })
      );
    } catch (error) {
      console.error("Failed to parse Nora launch command.", error);
    }
  };

  return {
    enqueueParsedLaunchCommand,
    flushLaunchCommands
  };
}
