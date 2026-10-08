import type { ToolUsageDetail, ToolUsageInfo, ToolUsageWindow } from "@shared/appTypes";

export type ToolUsageInfoInput = {
  status: ToolUsageInfo["status"];
  title: string;
  windows?: ToolUsageWindow[];
  account?: string | null;
  /** Context lines (e.g. auth hints) placed before the window lines in the transcript. */
  lines?: string[];
  notice?: string;
  details?: ToolUsageDetail[];
  rawOutput?: string;
  fetchedAt: string;
};

/** Raw text captured from a CLI status probe before it is normalized into windows. */
export type CliStatusCapture = {
  status: ToolUsageInfo["status"];
  lines: string[];
  rawOutput?: string;
};

export type InteractiveStatusDeps = {
  getToolEnv: (toolId: string) => Record<string, string>;
};
