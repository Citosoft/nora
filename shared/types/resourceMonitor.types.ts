export type ResourceMonitorEntryKind = "app" | "agent" | "terminal" | "local-terminal";

export type ResourceMonitorUsage = {
  cpuPercent: number | null;
  memoryBytes: number | null;
};

export type ResourceMonitorEntry = {
  id: string;
  kind: ResourceMonitorEntryKind;
  label: string;
  command: string;
  workspace: string | null;
  pid: number | null;
  status: string;
  processCount: number;
  childPids: number[];
  usage: ResourceMonitorUsage;
  unavailableReason: string | null;
};

export type ResourceMonitorSnapshot = {
  sampledAt: string;
  platform: NodeJS.Platform;
  appPid: number;
  total: ResourceMonitorUsage;
  entries: ResourceMonitorEntry[];
};
