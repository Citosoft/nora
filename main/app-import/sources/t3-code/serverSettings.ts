import path from "node:path";
import { z } from "zod";
import { readJsonFile } from "@main/app-import/fileSystem";
import { appImportKey } from "@main/app-import/importKey";
import { toProviderRef } from "@main/app-import/providerRef";
import { isSecretLikeName } from "@main/app-import/secretNames";
import type { AppImportEnvVar, AppImportSkippedItem } from "@shared/types/app-import/appImportPlan.types";
import type { AppImportSetting } from "@shared/types/app-import/appImportSetting.types";
import type { T3CodeProviderResolver, T3CodeServerSettings } from "@main/types/app-import/t3Code.types";

const optionalString = z.string().trim().min(1).optional().catch(undefined);
const environmentVariableSchema = z.object({
  name: z.string(),
  value: z.string().catch(""),
  sensitive: z.boolean().catch(false),
  valueRedacted: z.boolean().optional().catch(undefined),
  /** A secret-store reference; the real value lives in `secrets/`, which is never read. */
  secret: z.unknown().optional()
});
const providerInstanceSchema = z.object({
  driver: z.string(),
  displayName: optionalString,
  config: z.object({ binaryPath: optionalString, apiKey: z.unknown().optional() }).optional().catch(undefined),
  environment: z.array(environmentVariableSchema).optional().catch(undefined)
});
/** Only keys with a Nora mapping or a skip notice; T3 Code writes non-default ServerSettings only. */
const serverSettingsSchema = z.object({
  providerInstances: z.record(z.string(), providerInstanceSchema.optional().catch(undefined)).optional().catch(undefined),
  worktreesDirectory: optionalString,
  branchNamePrefix: z.string().trim().optional().catch(undefined),
  defaultTheme: optionalString,
  cloudSpeechCredentials: z.unknown().optional(),
  secretProviders: z.unknown().optional()
});

const EMPTY: T3CodeServerSettings = { resolveProvider: toProviderRef, settings: [], envVars: [], skipped: [], warnings: [] };

function hasEntries(value: unknown): boolean {
  return typeof value === "object" && value !== null && Object.keys(value).length > 0;
}

export async function readT3CodeServerSettings(stateDir: string): Promise<T3CodeServerSettings> {
  const file = await readJsonFile(path.join(stateDir, "settings.json"));
  if (file.status === "missing") return EMPTY;
  const parsed = file.status === "ok" ? serverSettingsSchema.safeParse(file.value) : null;
  if (!parsed?.success) return { ...EMPTY, warnings: ["T3 Code settings.json could not be read; settings were not imported."] };
  const source = parsed.data;
  const settings: AppImportSetting[] = [];
  const envVars: AppImportEnvVar[] = [];
  const skipped: AppImportSkippedItem[] = [];
  const instances = Object.entries(source.providerInstances ?? {}).flatMap(([id, instance]) => instance ? [{ id, instance }] : []);
  const drivers = new Map(instances.map(({ id, instance }) => [id, instance.driver]));
  const resolveProvider: T3CodeProviderResolver = (instanceId) => toProviderRef(drivers.get(instanceId) ?? instanceId);
  for (const { id, instance } of instances) {
    const provider = resolveProvider(id);
    const label = instance.displayName ?? id;
    if (instance.config?.binaryPath) {
      settings.push({ kind: "cliBinaryPath", provider, path: instance.config.binaryPath, importKey: appImportKey("t3-code", "setting", "cliBinaryPath", id), sourceKey: `settings.json#providerInstances.${id}.config.binaryPath` });
    }
    if (instance.config?.apiKey !== undefined && instance.config.apiKey !== "") {
      skipped.push({ kind: "secret", label: `${label} API key`, reason: "API keys are never imported." });
    }
    for (const variable of instance.environment ?? []) {
      if (variable.secret !== undefined || variable.sensitive || variable.valueRedacted || isSecretLikeName(variable.name)) {
        skipped.push({ kind: "secret", label: `${label} environment variable ${variable.name}`, reason: "Secret environment values are never imported." });
        continue;
      }
      envVars.push({ importKey: appImportKey("t3-code", "envVar", id, variable.name), name: variable.name, value: variable.value, scope: { kind: "provider", provider }, sensitive: true, selectedByDefault: false });
    }
  }
  if (source.worktreesDirectory) {
    settings.push({ kind: "worktreeBaseDir", path: source.worktreesDirectory, importKey: appImportKey("t3-code", "setting", "worktreeBaseDir"), sourceKey: "settings.json#worktreesDirectory" });
  }
  if (source.branchNamePrefix !== undefined) {
    settings.push({ kind: "branchPrefix", prefix: source.branchNamePrefix, importKey: appImportKey("t3-code", "setting", "branchPrefix"), sourceKey: "settings.json#branchNamePrefix" });
  }
  if (source.defaultTheme) {
    settings.push({ kind: "theme", theme: source.defaultTheme, importKey: appImportKey("t3-code", "setting", "theme"), sourceKey: "settings.json#defaultTheme" });
  }
  if (hasEntries(source.cloudSpeechCredentials)) skipped.push({ kind: "secret", label: "Cloud speech credentials", reason: "Credentials are never imported." });
  if (hasEntries(source.secretProviders)) skipped.push({ kind: "secret", label: "Secret providers", reason: "Secret provider configuration is never imported." });
  return { resolveProvider, settings, envVars, skipped, warnings: [] };
}
