import type { AppState, LocalTerminalState } from "@shared/appTypes";
import type { ResourceMonitorEntry, ResourceMonitorSnapshot, ResourceMonitorUsage } from "@shared/types/resourceMonitor.types";
import { execFile } from "node:child_process";
import os from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PROCESS_SAMPLE_TIMEOUT_MS = 2500;

export type SystemProcessSample = {
  pid: number;
  ppid: number;
  cpuPercent: number | null;
  memoryBytes: number | null;
  command: string;
};

type ResourceRoot = {
  id: string;
  kind: ResourceMonitorEntry["kind"];
  label: string;
  command: string;
  workspace: string | null;
  pid: number | null;
  status: string;
};

type WindowsProcessPayload = {
  pid: unknown;
  ppid: unknown;
  cpuPercent: unknown;
  rssBytes: unknown;
  command: unknown;
};

function parseNumber(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseUnixProcessSample(output: string): SystemProcessSample[] {
  return output
    .split(/\r?\n/)
    .map((line): SystemProcessSample | null => {
      const match = /^\s*(\d+)\s+(\d+)\s+([0-9.]+)\s+(\d+)\s+(.+?)\s*$/.exec(line);
      if (!match) {
        return null;
      }

      const pid = parseNumber(match[1]);
      const ppid = parseNumber(match[2]);
      const cpuPercent = parseNumber(match[3]);
      const rssKilobytes = parseNumber(match[4]);
      if (pid === null || ppid === null || rssKilobytes === null) {
        return null;
      }

      return {
        pid,
        ppid,
        cpuPercent,
        memoryBytes: rssKilobytes * 1024,
        command: match[5] ?? ""
      };
    })
    .filter((sample): sample is SystemProcessSample => sample !== null);
}

function isWindowsProcessPayload(value: unknown): value is WindowsProcessPayload {
  return typeof value === "object" && value !== null;
}

function parseWindowsNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    return parseNumber(value);
  }
  return null;
}

export function parseWindowsProcessSample(output: string): SystemProcessSample[] {
  if (!output.trim()) {
    return [];
  }

  const parsed: unknown = JSON.parse(output);
  const payloads = Array.isArray(parsed) ? parsed : [parsed];
  return payloads
    .map((payload): SystemProcessSample | null => {
      if (!isWindowsProcessPayload(payload)) {
        return null;
      }

      const pid = parseWindowsNumber(payload.pid);
      const ppid = parseWindowsNumber(payload.ppid);
      if (pid === null || ppid === null) {
        return null;
      }

      return {
        pid,
        ppid,
        cpuPercent: parseWindowsNumber(payload.cpuPercent),
        memoryBytes: parseWindowsNumber(payload.rssBytes),
        command: typeof payload.command === "string" ? payload.command : ""
      };
    })
    .filter((sample): sample is SystemProcessSample => sample !== null);
}

async function sampleUnixProcesses(): Promise<SystemProcessSample[]> {
  const { stdout } = await execFileAsync("ps", ["-axo", "pid=,ppid=,pcpu=,rss=,comm="], {
    timeout: PROCESS_SAMPLE_TIMEOUT_MS,
    maxBuffer: 1024 * 1024
  });
  return parseUnixProcessSample(stdout);
}

async function sampleWindowsProcesses(): Promise<SystemProcessSample[]> {
  const script = [
    "$perf = @{}",
    "Get-CimInstance Win32_PerfFormattedData_PerfProc_Process | ForEach-Object { $perf[[int]$_.IDProcess] = $_ }",
    "Get-CimInstance Win32_Process | ForEach-Object {",
    "  $p = $perf[[int]$_.ProcessId]",
    "  [PSCustomObject]@{",
    "    pid = [int]$_.ProcessId",
    "    ppid = [int]$_.ParentProcessId",
    "    cpuPercent = if ($p) { [double]$p.PercentProcessorTime } else { $null }",
    "    rssBytes = if ($p) { [double]$p.WorkingSet } else { $null }",
    "    command = $_.Name",
    "  }",
    "} | ConvertTo-Json -Compress"
  ].join("\n");
  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", script], {
    timeout: PROCESS_SAMPLE_TIMEOUT_MS,
    maxBuffer: 4 * 1024 * 1024
  });
  return parseWindowsProcessSample(stdout);
}

async function sampleSystemProcesses(platform: NodeJS.Platform): Promise<SystemProcessSample[]> {
  if (platform === "win32") {
    return sampleWindowsProcesses();
  }
  return sampleUnixProcesses();
}

function createChildrenIndex(processes: SystemProcessSample[]): Map<number, SystemProcessSample[]> {
  const childrenByParentPid = new Map<number, SystemProcessSample[]>();
  for (const item of processes) {
    const siblings = childrenByParentPid.get(item.ppid) ?? [];
    siblings.push(item);
    childrenByParentPid.set(item.ppid, siblings);
  }
  return childrenByParentPid;
}

export function collectProcessTree(
  rootPid: number,
  processes: SystemProcessSample[]
): SystemProcessSample[] {
  const byPid = new Map(processes.map((item) => [item.pid, item]));
  const childrenByParentPid = createChildrenIndex(processes);
  const visited = new Set<number>();
  const stack = [rootPid];
  const tree: SystemProcessSample[] = [];

  while (stack.length > 0) {
    const pid = stack.pop();
    if (pid === undefined || visited.has(pid)) {
      continue;
    }
    visited.add(pid);

    const item = byPid.get(pid);
    if (item) {
      tree.push(item);
    }

    for (const child of childrenByParentPid.get(pid) ?? []) {
      stack.push(child.pid);
    }
  }

  return tree;
}

export function normalizeProcessCpuPercent(cpuPercent: number | null, logicalCpuCount: number): number | null {
  if (cpuPercent === null) {
    return null;
  }

  const normalized = cpuPercent / Math.max(logicalCpuCount, 1);
  return Math.max(0, Math.min(normalized, 100));
}

function sumUsage(processes: SystemProcessSample[], logicalCpuCount: number): ResourceMonitorUsage {
  let cpuPercent: number | null = null;
  let memoryBytes: number | null = null;

  for (const item of processes) {
    if (item.cpuPercent !== null) {
      cpuPercent = (cpuPercent ?? 0) + item.cpuPercent;
    }
    if (item.memoryBytes !== null) {
      memoryBytes = (memoryBytes ?? 0) + item.memoryBytes;
    }
  }

  return {
    cpuPercent: normalizeProcessCpuPercent(cpuPercent, logicalCpuCount),
    memoryBytes
  };
}

function buildRoots(snapshot: AppState, localTerminal: LocalTerminalState | null): ResourceRoot[] {
  const roots: ResourceRoot[] = [
    {
      id: "app",
      kind: "app",
      label: "Nora app",
      command: process.execPath,
      workspace: null,
      pid: process.pid,
      status: "running"
    }
  ];

  for (const agent of snapshot.agents) {
    roots.push({
      id: agent.id,
      kind: "agent",
      label: agent.name,
      command: agent.command,
      workspace: agent.workspace,
      pid: agent.pid,
      status: agent.status
    });
  }

  for (const terminal of snapshot.terminals) {
    roots.push({
      id: terminal.id,
      kind: "terminal",
      label: terminal.name,
      command: terminal.command,
      workspace: terminal.workspace,
      pid: terminal.pid,
      status: terminal.status
    });
  }

  if (localTerminal) {
    roots.push({
      id: localTerminal.id,
      kind: "local-terminal",
      label: localTerminal.name,
      command: localTerminal.command,
      workspace: localTerminal.workspace,
      pid: localTerminal.pid,
      status: localTerminal.status
    });
  }

  return roots;
}

function buildEntry(root: ResourceRoot, processes: SystemProcessSample[], logicalCpuCount: number): ResourceMonitorEntry {
  if (root.pid === null) {
    return {
      ...root,
      processCount: 0,
      childPids: [],
      usage: { cpuPercent: null, memoryBytes: null },
      unavailableReason: "No active process id is available for this session."
    };
  }

  const processTree = collectProcessTree(root.pid, processes);
  if (processTree.length === 0) {
    return {
      ...root,
      processCount: 0,
      childPids: [],
      usage: { cpuPercent: null, memoryBytes: null },
      unavailableReason: "The process is no longer visible to the operating system."
    };
  }

  return {
    ...root,
    processCount: processTree.length,
    childPids: processTree.map((item) => item.pid).filter((pid) => pid !== root.pid),
    usage: sumUsage(processTree, logicalCpuCount),
    unavailableReason: null
  };
}

export async function sampleAppResourceUsage(
  snapshot: AppState,
  localTerminal: LocalTerminalState | null,
  platform: NodeJS.Platform = process.platform
): Promise<ResourceMonitorSnapshot> {
  const processes = await sampleSystemProcesses(platform);
  const logicalCpuCount = os.cpus().length || 1;
  const entries = buildRoots(snapshot, localTerminal).map((root) => buildEntry(root, processes, logicalCpuCount));
  const appEntry = entries.find((entry) => entry.kind === "app");

  return {
    sampledAt: new Date().toISOString(),
    platform,
    appPid: process.pid,
    total: appEntry?.usage ?? { cpuPercent: null, memoryBytes: null },
    entries
  };
}
