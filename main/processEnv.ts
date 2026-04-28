import { buildExecutableSearchPath } from "./pathEnv";

type ProcessEnvOptions = {
  platform?: NodeJS.Platform;
};

export function buildProcessEnv(
  baseEnv: NodeJS.ProcessEnv,
  extraEnv: Record<string, string> = {},
  options?: ProcessEnvOptions
): NodeJS.ProcessEnv {
  const platform = options?.platform ?? process.platform;
  const overridePath = extraEnv.PATH ?? extraEnv.Path ?? baseEnv.PATH ?? baseEnv.Path ?? "";
  const resolvedPath = buildExecutableSearchPath(baseEnv, {
    overridePath,
    platform
  });

  const env: NodeJS.ProcessEnv = {
    ...baseEnv,
    ...extraEnv,
    PATH: resolvedPath
  };

  if (platform === "win32") {
    env.Path = resolvedPath;
  }

  return env;
}
