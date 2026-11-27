import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { BackgroundTask } from "@shared/types/conversation/contracts.types";

type ClaudeBackgroundTasksChanged = Extract<SDKMessage, { type: "system"; subtype: "background_tasks_changed" }>;

/** Maps Claude's level signal to provider-neutral tasks, dropping ambient entries hosts should hide. */
export function normalizeClaudeBackgroundTasks(message: ClaudeBackgroundTasksChanged): BackgroundTask[] {
  return message.tasks.flatMap((task) => {
    if (task.ambient) return [];
    return [{ id: task.task_id, description: task.description, ...(task.task_type ? { kind: task.task_type } : {}) }];
  });
}
