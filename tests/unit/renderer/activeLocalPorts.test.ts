import { collectActiveLocalPorts } from "@/components/app/logic/activeLocalPorts";
import type { ActiveLocalPortSource } from "@/components/app/types/activeLocalPort.types";
import assert from "node:assert/strict";
import test from "node:test";

type TerminalSource = ActiveLocalPortSource["terminals"][number];

function createTerminal(overrides: Partial<TerminalSource> & Pick<TerminalSource, "id">): TerminalSource {
  return {
    name: `Terminal ${overrides.id}`,
    status: "running",
    detectedLocalPort: null,
    detectedLocalUrl: null,
    ...overrides
  };
}

function createWorkspace(id: string, name: string, terminals: TerminalSource[]): ActiveLocalPortSource {
  return { project: { id, name }, terminals };
}

test("collectActiveLocalPorts keeps only running terminals with a detected port and URL", () => {
  const ports = collectActiveLocalPorts([
    createWorkspace("p1", "Web", [
      createTerminal({ id: "t1", detectedLocalPort: 3000, detectedLocalUrl: "http://localhost:3000" }),
      createTerminal({ id: "t2", status: "stopped", detectedLocalPort: 3001, detectedLocalUrl: "http://localhost:3001" }),
      createTerminal({ id: "t3", detectedLocalPort: 3002, detectedLocalUrl: null }),
      createTerminal({ id: "t4" })
    ])
  ]);

  assert.deepEqual(ports, [
    {
      projectId: "p1",
      projectName: "Web",
      terminalId: "t1",
      terminalName: "Terminal t1",
      port: 3000,
      url: "http://localhost:3000"
    }
  ]);
});

test("collectActiveLocalPorts sorts across workspaces by port, then project name", () => {
  const ports = collectActiveLocalPorts([
    createWorkspace("p2", "Zeta", [createTerminal({ id: "z", detectedLocalPort: 5173, detectedLocalUrl: "http://localhost:5173" })]),
    createWorkspace("p1", "Alpha", [
      createTerminal({ id: "a1", detectedLocalPort: 5173, detectedLocalUrl: "http://localhost:5173" }),
      createTerminal({ id: "a2", detectedLocalPort: 3000, detectedLocalUrl: "http://localhost:3000" })
    ])
  ]);

  assert.deepEqual(
    ports.map((port) => `${port.port}:${port.projectName}`),
    ["3000:Alpha", "5173:Alpha", "5173:Zeta"]
  );
});
