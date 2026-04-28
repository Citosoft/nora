import type { ProjectSummary, WorkspaceScriptLauncher } from "@shared/appTypes";
import path from "node:path";
import type { WorkspaceTarget } from "../types/internal.types";
import type { detectWorkspaceFramework as detectWorkspaceFrameworkFn } from "./workspaceFramework";

type WorkspaceLocation = NonNullable<ProjectSummary["location"]> | undefined;

type WorkspaceDiscoveryDependencies = {
  workspacePathExists: (target: WorkspaceTarget, relativePath: string) => Promise<boolean>;
  readWorkspaceTextFile: (target: WorkspaceTarget, rootPath: string, relativePath: string) => Promise<string>;
  getWorkspaceLocation: (target: WorkspaceTarget) => WorkspaceLocation;
  detectWorkspaceFramework: typeof detectWorkspaceFrameworkFn;
};

const WORKSPACE_INSTRUCTION_FILE_NAMES = ["AGENTS.md", "agents.md"] as const;

export function createWorkspaceDiscoveryHelpers(deps: WorkspaceDiscoveryDependencies) {
  const detectWorkspaceInstructionFile = async (
    target: WorkspaceTarget
  ): Promise<ProjectSummary["workspaceInstructionFile"]> => {
    for (const fileName of WORKSPACE_INSTRUCTION_FILE_NAMES) {
      if (!(await deps.workspacePathExists(target, fileName))) {
        continue;
      }

      const location = deps.getWorkspaceLocation(target) || { kind: "local" as const };
      const absolutePath = location.kind === "ssh"
        ? path.posix.join(target.path.replace(/\\/g, "/"), fileName)
        : path.join(target.path, fileName);

      return {
        kind: "agents",
        fileName,
        relativePath: fileName,
        absolutePath
      };
    }

    return null;
  };

  const detectWorkspaceScripts = async (target: WorkspaceTarget): Promise<WorkspaceScriptLauncher[]> => {
    try {
      const packageJsonRaw = await deps.readWorkspaceTextFile(target, "", "package.json");
      const packageJson = JSON.parse(packageJsonRaw) as { scripts?: Record<string, string> };
      const scripts = packageJson.scripts || {};
      const preferredScriptNames = ["dev", "start", "test", "build", "storybook", "preview"];
      const allScriptNames = Object.entries(scripts)
        .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
        .map(([name]) => name);
      const availableNames = [
        ...preferredScriptNames.filter((name) => allScriptNames.includes(name)),
        ...allScriptNames.filter((name) => !preferredScriptNames.includes(name))
      ];

      if (!availableNames.length) {
        return [];
      }

      const packageManager =
        await deps.workspacePathExists(target, "pnpm-lock.yaml").then((found) => found ? "pnpm" as const : null).catch(() => null) ||
        await deps.workspacePathExists(target, "yarn.lock").then((found) => found ? "yarn" as const : null).catch(() => null) ||
        await deps.workspacePathExists(target, "package-lock.json").then((found) => found ? "npm" as const : null).catch(() => null) ||
        "npm" as const;

      return availableNames.map((scriptName) => {
        const command =
          packageManager === "pnpm"
            ? `pnpm ${scriptName}`
            : packageManager === "yarn"
              ? `yarn ${scriptName}`
              : `npm run ${scriptName}`;

        return {
          id: `${packageManager}:${scriptName}`,
          packageManager,
          scriptName,
          command,
          label: command
        };
      });
    } catch {
      return [];
    }
  };

  const detectDefaultWorktreePrepareCommand = async (target: WorkspaceTarget): Promise<string | null> => {
    try {
      if (await deps.workspacePathExists(target, "pnpm-lock.yaml")) {
        return "pnpm install";
      }
    } catch {}

    try {
      if (await deps.workspacePathExists(target, "yarn.lock")) {
        return "yarn install";
      }
    } catch {}

    try {
      if (await deps.workspacePathExists(target, "package-lock.json")) {
        return "npm install";
      }
    } catch {}

    try {
      if (await deps.workspacePathExists(target, "bun.lock")) {
        return "bun install";
      }
    } catch {}

    try {
      if (await deps.workspacePathExists(target, "bun.lockb")) {
        return "bun install";
      }
    } catch {}

    try {
      if (await deps.workspacePathExists(target, "package.json")) {
        return "npm install";
      }
    } catch {
      return null;
    }

    return null;
  };

  return {
    detectWorkspaceInstructionFile,
    detectWorkspaceScripts,
    detectDefaultWorktreePrepareCommand,
    detectWorkspaceFramework: (target: WorkspaceTarget) => deps.detectWorkspaceFramework(target, deps.readWorkspaceTextFile)
  };
}
