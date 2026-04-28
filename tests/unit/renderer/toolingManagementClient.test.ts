import assert from "node:assert/strict";
import test from "node:test";

import { createToolingManagementClient } from "@/components/app/clients/noraToolingManagementClient";
import type { ToolingManagementGatewayDeps } from "@/components/app/types/toolingManagementClient.types";

test("tooling management client delegates refresh, install, remove, switch, config, and skill flows", async () => {
  const calls: string[] = [];
  const client = createToolingManagementClient({
    refreshCatalog: async () => {
      calls.push("refresh");
      return null as never;
    },
    installTool: async (payload) => {
      calls.push(`install:${payload.toolId}:${payload.action}`);
      return null as never;
    },
    removeTool: async (payload) => {
      calls.push(`remove:${payload.toolId}:${payload.action}`);
      return null as never;
    },
    switchToolAccount: async (toolId) => {
      calls.push(`switch:${toolId}`);
      return null as never;
    },
    saveToolConfig: async (payload) => {
      calls.push(`save:${payload.toolId}`);
      return null as never;
    },
    installToolSkill: async (payload) => {
      calls.push(`install-skill:${payload.toolId}:${payload.skillReference}`);
      return null as never;
    },
    removeToolSkill: async (payload) => {
      calls.push(`remove-skill:${payload.toolId}:${payload.skillId}`);
      return null as never;
    }
  } satisfies ToolingManagementGatewayDeps);

  await client.refreshToolCatalog();
  await client.installManagedTool({ toolId: "codex", action: "install", installCommand: "npm i" });
  await client.removeManagedTool({ toolId: "codex", action: "remove", installCommand: "npm rm" });
  await client.switchManagedToolAccount("codex");
  await client.saveManagedToolConfig({ toolId: "codex", values: { enabled: "true" } });
  await client.installManagedToolSkill({ toolId: "codex", skillReference: "repo/skill" });
  await client.removeManagedToolSkill({ toolId: "codex", skillId: "skill-1" });

  assert.deepEqual(calls, [
    "refresh",
    "install:codex:install",
    "remove:codex:remove",
    "switch:codex",
    "save:codex",
    "install-skill:codex:repo/skill",
    "remove-skill:codex:skill-1"
  ]);
});
