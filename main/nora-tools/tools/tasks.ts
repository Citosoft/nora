import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NORA_TOOLS } from "@shared/nora-tools/catalog";
import type { NoraToolContext, NoraToolDeps } from "@main/types/nora-tools/noraTools.types";
import { runTool } from "./result";

export function registerTaskTools(server: McpServer, context: NoraToolContext, deps: NoraToolDeps): void {
  server.registerTool("list_tasks", { ...NORA_TOOLS.list_tasks, annotations: { readOnlyHint: true, openWorldHint: false } }, () => runTool(async () => {
    const tasks = await deps.tasks.list(context);
    if (!tasks.length) return "This workspace's task board is empty.";
    return tasks.map((task) => `- ${task.title} (id ${task.id}; path ${task.path}); column ${task.column}${task.completed ? "; completed" : ""}`).join("\n");
  }));
  server.registerTool("create_task", { ...NORA_TOOLS.create_task,
    inputSchema: {
      title: z.string().trim().min(1).max(200).describe("Short task title"),
      details: z.string().trim().max(20_000).optional().describe("Markdown body: goal, context and definition of done")
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  }, (input) => runTool(async () => {
    const task = await deps.tasks.create(input.title, input.details, context);
    return `Created task "${task.title}" (id ${task.id}) at ${task.path} in ${task.column}.`;
  }));
  const taskIdSchema = { id: z.string().trim().min(1).max(1024).describe("Stable task id from list_tasks or the task handoff") };
  server.registerTool("read_task", { ...NORA_TOOLS.read_task, inputSchema: taskIdSchema,
    annotations: { readOnlyHint: true, openWorldHint: false }
  }, (input) => runTool(async () => {
    const { task, content } = await deps.tasks.read(input.id, context);
    return `${task.title} (id ${task.id}); column ${task.column}; ${task.completed ? "completed" : "incomplete"}\n\n${content}`;
  }));
  for (const name of ["start_task", "finish_task"] as const) {
    server.registerTool(name, { ...NORA_TOOLS[name], inputSchema: taskIdSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    }, (input) => runTool(async () => {
      const task = await (name === "start_task" ? deps.tasks.start : deps.tasks.finish)(input.id, context);
      return `${task.title} (id ${task.id}); column ${task.column}; ${task.completed ? "completed" : "incomplete"}.`;
    }));
  }
  server.registerTool("move_task", { ...NORA_TOOLS.move_task,
    inputSchema: {
      path: z.string().min(1).max(1024).describe("Task path from list_tasks, e.g. .nora/tasks/fix-login-abc.md"),
      column: z.string().min(1).max(100).describe("Column id or title, e.g. in-progress or Done")
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, (input) => runTool(async () => {
    const task = await deps.tasks.move(input.path, input.column, context);
    return `Moved "${task.title}" to ${task.column}.`;
  }));
}
