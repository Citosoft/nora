import path from "node:path";

export type LaunchCommand = {
  projectRoot: string;
  task: string | null;
};

type ParseLaunchCommandOptions = {
  argv: string[];
  cwd: string;
  appRoot: string;
};

const IGNORED_PREFIXES = [
  "--disable-gpu",
  "--enable-logging",
  "--inspect",
  "--inspect-brk",
  "--original-process-start-time",
  "--remote-debugging-port",
  "--squirrel-"
] as const;

export function parseLaunchCommand({
  argv,
  cwd,
  appRoot
}: ParseLaunchCommandOptions): LaunchCommand | null {
  const normalizedCwd = path.resolve(cwd);
  const normalizedAppRoot = path.resolve(appRoot);
  const args = argv.filter((arg, index) => {
    if (index === 0) {
      return false;
    }
    if (!arg.startsWith("-")) {
      return !isAppEntrypointArg(arg, normalizedCwd, normalizedAppRoot);
    }
    return !IGNORED_PREFIXES.some((prefix) => arg === prefix || arg.startsWith(`${prefix}=`));
  });

  let projectArg: string | null = null;
  let task: string | null = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? "";
    if (!arg) {
      continue;
    }

    if (arg === "--task") {
      const nextArg = args[index + 1]?.trim() ?? "";
      if (!nextArg) {
        throw new Error("Expected a value after --task.");
      }
      task = nextArg;
      index += 1;
      continue;
    }

    if (arg.startsWith("--task=")) {
      const inlineValue = arg.slice("--task=".length).trim();
      if (!inlineValue) {
        throw new Error("Expected a value after --task=");
      }
      task = inlineValue;
      continue;
    }

    if (arg.startsWith("-")) {
      continue;
    }

    if (!projectArg) {
      projectArg = arg;
    }
  }

  const resolvedProjectRoot = path.resolve(normalizedCwd, projectArg || ".");
  if (!projectArg && !task) {
    return null;
  }

  return {
    projectRoot: resolvedProjectRoot,
    task
  };
}

function isAppEntrypointArg(arg: string, cwd: string, appRoot: string): boolean {
  const trimmed = arg.trim();
  if (!trimmed) {
    return false;
  }

  const resolved = path.resolve(cwd, trimmed);
  return resolved === appRoot;
}
