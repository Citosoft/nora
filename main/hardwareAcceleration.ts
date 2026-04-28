import fs from "node:fs";

export function parseHardwareAccelerationEnabledFromSettings(raw: string): boolean {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return true;
    }

    const candidate = parsed as { hardwareAccelerationEnabled?: unknown };
    return candidate.hardwareAccelerationEnabled !== false;
  } catch {
    return true;
  }
}

export function resolveHardwareAccelerationEnabledAtStartup(
  appSettingsPath: string,
  env: NodeJS.ProcessEnv,
  readFileSync: (path: string, encoding: BufferEncoding) => string = fs.readFileSync
): boolean {
  if (env.NORA_DISABLE_HARDWARE_ACCELERATION === "1") {
    return false;
  }

  try {
    const rawSettings = readFileSync(appSettingsPath, "utf8");
    return parseHardwareAccelerationEnabledFromSettings(rawSettings);
  } catch {
    return true;
  }
}
