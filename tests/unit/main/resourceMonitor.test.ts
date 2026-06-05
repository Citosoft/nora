import {
  collectProcessTree,
  normalizeProcessCpuPercent,
  parseUnixProcessSample,
  parseWindowsProcessSample
} from "@main/resource-monitor/processResourceSampler";
import assert from "node:assert/strict";
import test from "node:test";

test("parseUnixProcessSample reads ps rows with resource usage", () => {
  const samples = parseUnixProcessSample(`
      10       1  2.5  12000 electron
      20      10  0.3   8000 bash
      21      20 10.0  64000 codex
  `);

  assert.deepEqual(samples, [
    {
      pid: 10,
      ppid: 1,
      cpuPercent: 2.5,
      memoryBytes: 12000 * 1024,
      command: "electron"
    },
    {
      pid: 20,
      ppid: 10,
      cpuPercent: 0.3,
      memoryBytes: 8000 * 1024,
      command: "bash"
    },
    {
      pid: 21,
      ppid: 20,
      cpuPercent: 10,
      memoryBytes: 64000 * 1024,
      command: "codex"
    }
  ]);
});

test("parseWindowsProcessSample reads powershell process payloads", () => {
  const samples = parseWindowsProcessSample(JSON.stringify([
    {
      pid: 100,
      ppid: 4,
      cpuPercent: 3,
      rssBytes: 4096,
      command: "Nora.exe"
    }
  ]));

  assert.deepEqual(samples, [
    {
      pid: 100,
      ppid: 4,
      cpuPercent: 3,
      memoryBytes: 4096,
      command: "Nora.exe"
    }
  ]);
});

test("collectProcessTree includes nested subprocesses", () => {
  const tree = collectProcessTree(10, [
    { pid: 10, ppid: 1, cpuPercent: 1, memoryBytes: 100, command: "electron" },
    { pid: 20, ppid: 10, cpuPercent: 2, memoryBytes: 200, command: "shell" },
    { pid: 21, ppid: 20, cpuPercent: 3, memoryBytes: 300, command: "agent" },
    { pid: 30, ppid: 1, cpuPercent: 4, memoryBytes: 400, command: "other" }
  ]);

  assert.deepEqual(tree.map((sample) => sample.pid).sort((left, right) => left - right), [10, 20, 21]);
});

test("normalizeProcessCpuPercent reports whole-machine CPU share", () => {
  assert.equal(normalizeProcessCpuPercent(200, 8), 25);
  assert.equal(normalizeProcessCpuPercent(1200, 8), 100);
  assert.equal(normalizeProcessCpuPercent(null, 8), null);
});
