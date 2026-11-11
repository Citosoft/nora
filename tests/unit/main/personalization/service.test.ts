import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_APP_SETTINGS } from "@shared/appTypes";
import { PersonalizationService } from "@main/personalization/service";
import type { WorkspaceCatalog } from "@main/types/personalization/services.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";

test("onboarding retries provision before settings, preserves explicit preferences and serializes role updates", async () => {
  let settings = structuredClone(DEFAULT_APP_SETTINGS);
  settings.confirmSplitViewDelete = false; settings.preferredAgentToolId = "my-tool";
  const personal: NativeWorkspace = { id: "personal", name: "Personal", kind: "personal", workspace: {
    projectId: "personal", environmentId: "local", checkoutId: "checkout", path: "/personal", branch: "", access: "write" } };
  let provisioned = false, fail = true;
  const catalog: WorkspaceCatalog = { list: () => provisioned ? [personal] : [], registrations: () => [], async bindProject() { throw new Error("unused"); },
    async ensurePersonal() { if (fail) throw new Error("Storage unavailable"); provisioned = true; return personal; },
    async addFolder() { return personal; } };
  const service = new PersonalizationService({ read: () => settings, async update(change) { settings = change(settings); return settings; } }, catalog,
    { environmentId: "local", providers: [], cursor: () => 7, async chooseFolder() { return null; }, async openFolder() {} });
  await assert.rejects(service.request({ kind: "onboard", role: { id: "writing" } }), /Storage unavailable/);
  assert.equal(settings.personalization.defaultRole, null);
  fail = false;
  const state = await service.request({ kind: "onboard", role: { id: "writing" } });
  assert.equal(state.cursor, 7); assert.equal(state.workspaces.length, 1);
  assert.equal(service.state().personalization.defaultRole?.id, "writing");
  assert.equal(settings.confirmSplitViewDelete, false); assert.equal(settings.preferredAgentToolId, "my-tool");
  await Promise.all([
    service.request({ kind: "set-role", workspaceId: "personal", role: { id: "research" } }),
    service.request({ kind: "set-role", workspaceId: null, role: { id: "developer" } })
  ]);
  assert.equal(settings.personalization.workspaceRoles.personal.id, "research");
  assert.equal(service.state().personalization.defaultRole?.id, "developer");
  await service.request({ kind: "set-role", workspaceId: "personal", role: null });
  assert.deepEqual(settings.personalization.workspaceRoles, {});
  await assert.rejects(service.request({ kind: "set-role", workspaceId: "missing", role: { id: "general" } }), /existing workspace/);
  await assert.rejects(service.request({ kind: "set-role", workspaceId: null, role: null }), /app default/);
});

test("refresh-providers replaces the offered providers with a fresh discovery", async () => {
  const settings = structuredClone(DEFAULT_APP_SETTINGS);
  const catalog: WorkspaceCatalog = { list: () => [], registrations: () => [], async bindProject() { throw new Error("unused"); },
    async ensurePersonal() { throw new Error("unused"); }, async addFolder() { throw new Error("unused"); } };
  let discoveries = 0;
  const service = new PersonalizationService({ read: () => settings, async update(change) { return change(settings); } }, catalog, {
    environmentId: "local", cursor: () => 0, providers: [{ kind: "claude", instanceId: "local", label: "Claude" }],
    async refreshProviders() { discoveries++; return [{ kind: "claude", instanceId: "local", label: "Claude" }, { kind: "grok", instanceId: "local", label: "Grok Build" }]; },
    async chooseFolder() { return null; }, async openFolder() {} });
  assert.deepEqual(service.state().providers.map((provider) => provider.kind), ["claude"]);
  assert.deepEqual((await service.request({ kind: "refresh-providers" })).providers.map((provider) => provider.kind), ["claude", "grok"]);
  assert.deepEqual((await service.request({ kind: "boot" })).providers.map((provider) => provider.kind), ["claude", "grok"], "boot keeps the refreshed list");
  assert.equal(discoveries, 1);
});
