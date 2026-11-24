import { botSettingsResponseSchema, remoteSettingsSchema, remoteSettingsPatchSchema, saveRemoteBotSchema } from "@shared/remote-access/management";
import { threadPreferences } from "@shared/personalization/threads";
import { NORA_BOT_ID } from "@shared/bots/catalog";
import { sameBotScope } from "@shared/bots/settingsMutations";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { RuntimeApiOptions } from "@main/types/remote-access/http/runtime.types";
import { remoteProviderBinding } from "./defaultBinding";
import { RuntimeFailure } from "./failure";

export function managedBots(boot: NativeBoot) {
  const settings = boot.personalization.bots;
  const workspaceIds = new Set(boot.workspaces.filter((entry) => entry.workspace.environmentId === boot.environmentId).map((entry) => entry.id));
  return [...settings?.global ?? [], ...Object.entries(settings?.workspaces ?? {}).flatMap(([id, value]) => workspaceIds.has(id) ? value.private : []),
    ...boot.sharedBots.flatMap((set) => workspaceIds.has(set.workspaceId) ? set.bots : [])];
}

export function readRemoteManagement(options: RuntimeApiOptions, kind: "settings" | "bot-settings"): Response {
  if (!options.management) throw new RuntimeFailure("unavailable", "Update Nora on this computer to manage settings and bots.");
  const boot = options.boot();
  return Response.json(kind === "settings" ? remoteSettingsSchema.strip().parse(threadPreferences(boot.personalization))
    : botSettingsResponseSchema.parse({ bots: managedBots(boot) }));
}

export async function updateRemoteManagement(options: RuntimeApiOptions, kind: "settings-update" | "bot-save", body: unknown): Promise<Response> {
  if (!options.management) throw new RuntimeFailure("unavailable", "Update Nora on this computer to manage settings and bots.");
  if (kind === "settings-update") {
    await options.management.request({ kind: "set-thread-preferences", patch: remoteSettingsPatchSchema.parse(body) });
    return readRemoteManagement(options, "settings");
  }
  const input = saveRemoteBotSchema.parse(body);
  if (input.id === NORA_BOT_ID) throw new RuntimeFailure("invalid", "This bot id is reserved.");
  const boot = options.boot();
  const existing = managedBots(boot).find((bot) => bot.id === input.id && sameBotScope(bot.scope, input.scope));
  if (input.revision === null ? !!existing : !existing || existing.revision !== input.revision) {
    throw new RuntimeFailure("conflict", "This bot changed or was removed. Reload bots before saving again.");
  }
  if (!existing && input.scope.kind === "workspace" && input.scope.storage === "shared") throw new RuntimeFailure("invalid", "Create a private workspace bot or a global bot.");
  const workspace = boot.workspaces.find((entry) => entry.workspace.environmentId === boot.environmentId
    && (input.scope.kind === "global" || entry.id === input.scope.workspaceId));
  if (!workspace) throw new RuntimeFailure("invalid", "Choose an available workspace on this computer.");
  const binding = existing?.binding ?? await remoteProviderBinding(options, workspace.workspace);
  const { revision: _revision, ...fields } = input;
  await options.management.request({ kind: "save-bot", bot: { ...existing, ...fields, binding, revision: existing?.revision ?? 1 }, previousScope: existing?.scope ?? null, ...(existing ? { expectedRevision: existing.revision } : {}) });
  return readRemoteManagement(options, "bot-settings");
}
