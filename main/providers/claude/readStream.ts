import { ClaudeStreamNormalizer } from "./streamNormalizer";
import type { ClaudeFrame, ClaudeMcpAppLookup, ClaudeMessageStream } from "@main/types/execution/claude.types";
import { CLAUDE_MCP_TOOL_UI_CAPABILITY, callsClaudeMcpTool } from "./mcpApps";

/** Widget metadata is a nicety; a slow status read must not hold up the transcript for long. */
const MCP_APPS_WAIT_MS = 3000;

async function within<T>(pending: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([pending, new Promise<T>((resolve) => { timer = setTimeout(() => resolve(fallback), ms); })]);
  } finally { clearTimeout(timer); }
}

/** Deliver completion immediately, then drain the optional suggestion without keeping a CLI alive indefinitely. */
export async function* readClaudeStream(source: ClaudeMessageStream, releaseInput: () => void, drainMs = 5000,
  readThreshold?: () => Promise<number | undefined>, readMcpApps?: () => Promise<ClaudeMcpAppLookup | null>): AsyncGenerator<ClaudeFrame> {
  const normalize = new ClaudeStreamNormalizer();
  // Read once, when the first MCP tool is called: servers connect in the background, so status at init can be incomplete.
  let mcpAppsSupported = false;
  let mcpAppsApplied = false;
  let completed = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    for await (const message of source) {
      let threshold: number | undefined;
      if (message.type === "system" && message.subtype === "init") mcpAppsSupported = !!message.capabilities?.includes(CLAUDE_MCP_TOOL_UI_CAPABILITY);
      if (readMcpApps && mcpAppsSupported && !mcpAppsApplied && callsClaudeMcpTool(message)) {
        mcpAppsApplied = true;
        const lookup = await within(readMcpApps().catch(() => null), MCP_APPS_WAIT_MS, null);
        if (lookup) normalize.useMcpApps(lookup);
      }
      if (message.type === "prompt_suggestion" && !completed) continue;
      if (message.type === "result") {
        if (readThreshold) {
          let policyTimer: ReturnType<typeof setTimeout> | undefined;
          try {
            threshold = await Promise.race([Promise.resolve().then(readThreshold).catch(() => undefined),
              new Promise<undefined>((resolve) => { policyTimer = setTimeout(() => resolve(undefined), 1000); })]);
          } finally { clearTimeout(policyTimer); }
        }
        completed = true;
        releaseInput();
        timeout = setTimeout(() => source.close(), drainMs);
        timeout.unref();
      }
      for (const frame of normalize.accept(message, threshold)) yield frame;
      if (message.type === "prompt_suggestion") break;
    }
  } catch (cause) {
    // A failed optional prediction cannot turn a completed task into a connection error.
    if (!completed) throw cause;
  } finally {
    clearTimeout(timeout);
    releaseInput();
  }
}
