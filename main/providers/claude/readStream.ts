import { ClaudeStreamNormalizer } from "./streamNormalizer";
import type { ClaudeFrame, ClaudeMessageStream } from "@main/types/execution/claude.types";

/** Deliver completion immediately, then drain the optional suggestion without keeping a CLI alive indefinitely. */
export async function* readClaudeStream(source: ClaudeMessageStream, releaseInput: () => void, drainMs = 5000,
  readThreshold?: () => Promise<number | undefined>): AsyncGenerator<ClaudeFrame> {
  const normalize = new ClaudeStreamNormalizer();
  let completed = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    for await (const message of source) {
      let threshold: number | undefined;
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
