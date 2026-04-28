import type { AppState, ConnectRemoteProjectPayload } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

import { createRemoteWorkspaceClient } from "@/components/app/clients/noraRemoteWorkspaceClient";
import type { RemoteWorkspaceGatewayDeps } from "@/components/app/types/remoteWorkspaceClient.types";

function createSnapshot(id: string): AppState {
  return {
    screen: "project-selector",
    project: null,
    projectBranches: [],
    currentSessionId: null,
    sessions: [],
    worktrees: [],
    workspaces: [],
    recentProjects: [],
    focusedAgentId: null,
    focusedTerminalId: null,
    selectedChangePath: null,
    selectedCommitHash: null,
    selectedCommit: null,
    changesRoot: null,
    changes: [],
    commitHistory: [],
    activeRemoteMounts: [],
    projectScripts: [],
    defaultWorktreePrepareCommand: null,
    agents: [],
    terminals: [],
    terminalShells: [],
    agentCatalog: [],
    agentSkillCatalogs: [],
    errorMessage: id
  };
}

test("openRemoteWorkspace uses ssh flow directly", async () => {
  const calls: string[] = [];
  const sshSnapshot = createSnapshot("ssh");
  const client = createRemoteWorkspaceClient({
    openSshProject: async (payload) => {
      calls.push(`ssh:${payload.host}`);
      return sshSnapshot;
    },
    mountRemoteProject: async () => {
      calls.push("mount");
      return { mountPoint: "/mnt/remote", mountedUnc: "" };
    },
    connectRemoteProject: async () => {
      calls.push("connect");
      return createSnapshot("mounted");
    }
  } satisfies RemoteWorkspaceGatewayDeps);

  const payload: ConnectRemoteProjectPayload = {
    connectionMode: "ssh",
    host: "example.com",
    port: 22,
    user: "devuser",
    remotePath: "/srv/project",
    alias: "example"
  };

  const result = await client.openRemoteWorkspace(payload);

  assert.equal(result, sshSnapshot);
  assert.deepEqual(calls, ["ssh:example.com"]);
});

test("openRemoteWorkspace mounts then connects for mount mode", async () => {
  const calls: string[] = [];
  const mountedSnapshot = createSnapshot("mounted");
  const client = createRemoteWorkspaceClient({
    openSshProject: async () => {
      calls.push("ssh");
      return createSnapshot("ssh");
    },
    mountRemoteProject: async (payload) => {
      calls.push(`mount:${payload.host}:${payload.remotePath}`);
      return { mountPoint: "/mnt/project", mountedUnc: "" };
    },
    connectRemoteProject: async (mountPoint, host) => {
      calls.push(`connect:${mountPoint}:${host}`);
      return mountedSnapshot;
    }
  } satisfies RemoteWorkspaceGatewayDeps);

  const payload: ConnectRemoteProjectPayload = {
    connectionMode: "mount",
    host: "remote.internal",
    port: 22,
    user: "devuser",
    remotePath: "/srv/project",
    alias: "remote-project"
  };

  const result = await client.openRemoteWorkspace(payload);

  assert.equal(result, mountedSnapshot);
  assert.deepEqual(calls, ["mount:remote.internal:/srv/project", "connect:/mnt/project:remote.internal"]);
});
