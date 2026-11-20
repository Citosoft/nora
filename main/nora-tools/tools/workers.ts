import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NORA_TOOLS } from "@shared/nora-tools/catalog";
import { askBotThreadMark } from "@shared/nora-tools/askBot";
import type { NoraToolContext, NoraToolDeps, NoraWorkerReport, NoraWorkerStatus } from "@main/types/nora-tools/noraTools.types";
import { runTool } from "./result";

/** Stays under the runtimes' per-call limit (NORA_TOOL_TIMEOUT_SECONDS), so a long wait returns instead of being cut off. */
const WAIT_MAX_MINUTES = 15;
const workerId = z.string().trim().min(1).max(512);
const STATUS_LABELS: Record<NoraWorkerStatus, string> = {
  "running": "still running", "needs-approval": "waiting for the user's approval in its thread", "needs-input": "waiting for the user's answer in its thread",
  "paused": "its queue is paused", "completed": "completed", "failed": "failed", "interrupted": "was stopped", "ready": "has not started any work"
};

function reportLines(worker: NoraWorkerReport): string {
  const head = `## ${worker.title} ${askBotThreadMark(worker.id)}: ${STATUS_LABELS[worker.status]}${worker.status === "failed" && worker.failure ? ` (${worker.failure})` : ""}`;
  return worker.report ? `${head}\n\n${worker.report}` : head;
}

/** Orchestration for Nora and bot task threads: hand parts of a job to worker threads, follow up, and collect their reports. */
export function registerWorkerTools(server: McpServer, context: NoraToolContext, deps: NoraToolDeps): void {
  server.registerTool("start_thread", { ...NORA_TOOLS.start_thread,
    inputSchema: {
      title: z.string().trim().min(1).max(100).describe("Short name for the worker's thread, shown in the sidebar"),
      prompt: z.string().trim().min(1).max(20_000).describe("The worker's complete brief: the goal, the context it needs (it cannot see this thread), the files or area to work in, and what to report back"),
      done: z.string().trim().min(1).max(1_000).optional().describe("What finished looks like for this part, in a sentence or two: the outcome or checks that mean it is complete. The worker checks it before reporting, and the user sees it on the thread"),
      provider: z.string().min(1).optional().describe("Provider kind or instance from list_models, e.g. claude or codex; defaults to this thread's"),
      model: z.string().min(1).optional().describe("Model id from list_models for that provider"),
      bot: z.string().trim().min(1).max(100).optional().describe("Run the worker as this saved bot (id or name from list_bots), on the bot's own model and instructions, instead of provider and model"),
      isolation: z.enum(["worktree", "shared"]).optional().describe("worktree creates a separate Git checkout (default for write access in Git); shared uses this thread’s checkout (default for read access and non-Git folders)"),
      access: z.enum(["write", "read"]).optional().describe("write (default) lets the worker change the workspace; read only lets it inspect")
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  }, (input) => runTool(async () => {
    const worker = await deps.workers.start(input, context);
    return `Started "${worker.title}" ${askBotThreadMark(worker.id)} on ${worker.runsAs} with ${worker.access} access. It is working in the background; `
      + `collect its report with wait_for_threads (id ${worker.id}). Workspace: ${worker.workspace.path} (branch ${worker.workspace.branch || "none"}).`;
  }));
  server.registerTool("message_thread", { ...NORA_TOOLS.message_thread,
    inputSchema: {
      id: workerId.describe("The worker's thread id from start_thread"),
      prompt: z.string().trim().min(1).max(20_000).describe("The follow-up instruction")
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  }, (input) => runTool(async () => {
    const worker = await deps.workers.message(input.id, input.prompt, context);
    return `Sent to "${worker.title}" ${askBotThreadMark(worker.id)}. Collect its answer with wait_for_threads.`;
  }));
  server.registerTool("wait_for_threads", { ...NORA_TOOLS.wait_for_threads,
    inputSchema: {
      ids: z.array(workerId).min(1).max(20).optional().describe("Worker thread ids to wait for; omit for every unsettled worker of this thread"),
      mode: z.enum(["all", "any"]).optional().describe("all (default) waits for every worker; any returns when the first one finishes"),
      timeout_minutes: z.number().int().min(1).max(WAIT_MAX_MINUTES).optional().describe(`Longest to wait before returning with the ones still running (default and most ${WAIT_MAX_MINUTES})`)
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  }, (input, extra) => runTool(async () => {
    const workers = await deps.workers.wait({ ...(input.ids ? { ids: input.ids } : {}), mode: input.mode ?? "all",
      timeoutMs: (input.timeout_minutes ?? WAIT_MAX_MINUTES) * 60_000 }, context, extra.signal);
    const waiting = workers.filter((worker) => worker.status === "running").length;
    const footer = waiting ? `\n\n${waiting} still running; call wait_for_threads again to keep waiting.` : "";
    return workers.map(reportLines).join("\n\n") + footer;
  }));
}
