import assert from "node:assert/strict";
import test from "node:test";
import { buildConnectorAccess, buildConnectorAccessChoices, connectorAccessDraft, describeConnectorAccess, summarizeConnectorAccess } from "@/components/app/logic/connectorAccess";
import type { ConnectorAccessChoices, ConnectorAccessSource } from "@/components/app/types/noraConnectors.types";
import { bot } from "../shared/bots/fixtures";

const workspaceChoice = (id: string, name: string) => ({ kind: "workspace" as const, id, name, avatar: { id, name } });
const botChoice = (id: string, name: string) => ({ kind: "bot" as const, id, name, detail: "All workspaces", avatar: bot(id).avatar });
const CHOICES: ConnectorAccessChoices = { workspaces: [workspaceChoice("w", "Acme"), workspaceChoice("v", "Web")],
  bots: [botChoice("ada", "Ada"), botChoice("grace", "Grace")] };

test("picks that no longer exist drop out, and a limit with no picks left asks for one", () => {
  assert.deepEqual(buildConnectorAccess({ workspaces: { kind: "only", ids: ["w", "gone"] }, bots: { kind: "all", ids: ["ada"] } }, CHOICES),
    { ok: true, access: { workspaces: { kind: "only", ids: ["w"] }, bots: { kind: "all" } } });
  const stale = buildConnectorAccess({ workspaces: { kind: "all", ids: [] }, bots: { kind: "only", ids: ["gone"] } }, CHOICES);
  assert.equal(stale.ok, false);
  assert.deepEqual(connectorAccessDraft({ workspaces: { kind: "all" }, bots: { kind: "only", ids: ["ada"] } }),
    { workspaces: { kind: "all", ids: [] }, bots: { kind: "only", ids: ["ada"] } });
});

test("the summary names a single pick and counts several", () => {
  assert.equal(describeConnectorAccess({ workspaces: { kind: "all" }, bots: { kind: "all" } }, CHOICES), "Everywhere");
  assert.equal(describeConnectorAccess({ workspaces: { kind: "only", ids: ["w"] }, bots: { kind: "only", ids: ["ada", "grace"] } }, CHOICES), "Acme · 2 bots");
  assert.equal(describeConnectorAccess({ workspaces: { kind: "all" }, bots: { kind: "only", ids: ["gone"] } }, CHOICES), "1 bot");
});

test("summary parts carry the picks still known, for their icons", () => {
  const parts = summarizeConnectorAccess({ workspaces: { kind: "only", ids: ["w"] }, bots: { kind: "only", ids: ["ada", "gone"] } }, CHOICES);
  assert.deepEqual(parts.map(({ label, choices }) => [label, choices.map((choice) => choice.id)]), [["Acme", ["w"]], ["2 bots", ["ada"]]]);
  assert.deepEqual(summarizeConnectorAccess({ workspaces: { kind: "all" }, bots: { kind: "all" } }, CHOICES), []);
});

test("bots are offered once each: global bots everywhere, workspace bots labelled with their workspace", () => {
  const workspace = (id: string, name: string, shellProjectId?: string) => ({ id, name, kind: "folder" as const, ...(shellProjectId ? { shellProjectId } : {}),
    workspace: { environmentId: "local", projectId: id, checkoutId: "c", path: `/${id}`, branch: "main", access: "write" as const } });
  const source = {
    workspaces: [workspace("w", "Acme", "shell-w"), workspace("v", "Web")],
    personalization: { bots: { global: [bot("ada")], workspaces: { w: { private: [bot("grace", { kind: "workspace", workspaceId: "w", storage: "private" })], hidden: [] } } } },
    sharedBots: [{ workspaceId: "v", bots: [bot("lin", { kind: "workspace", workspaceId: "v", storage: "shared" })], problems: [] }]
  } as unknown as ConnectorAccessSource;
  const choices = buildConnectorAccessChoices(source);
  assert.deepEqual(choices.workspaces.map(({ id, avatar }) => [id, avatar.id]), [["w", "shell-w"], ["v", "v"]], "avatars use the shell project when there is one");
  assert.deepEqual(choices.bots.map(({ id, detail }) => [id, detail]), [["ada", "All workspaces"], ["grace", "Acme"], ["lin", "Web"]]);
  assert.deepEqual(choices.bots[0]?.avatar, bot("ada").avatar);
});
