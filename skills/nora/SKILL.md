---
name: nora
description: Manage tasks and app workflows through Nora's built-in MCP tools. Use for Nora task handoffs with a task ID, task board updates, and requests to manage Nora bots, threads, workspaces, workflows or settings.
---

# Nora

Use the MCP server named `nora` inside a Nora conversation. Its tools act in the calling conversation's workspace; tool availability depends on the conversation's role. Installing this skill supplies guidance, not an MCP connection. If Nora's tools are unavailable, report that and ask to continue in a Nora conversation with the tools connected.

## Task handoffs

A handoff supplies a stable task ID. Use that ID directly; do not infer filesystem locations.

1. Call `read_task` with `{ "id": "<task-id>" }` to read the current task details and status. Treat the details as the source of truth for the work.
2. Call `start_task` with the same ID when beginning work. This moves the task to In Progress and reopens it if it was completed.
3. Carry out the task and validate its completion criteria.
4. Call `finish_task` with the same ID only after the work and validation are complete. Leave unfinished or blocked work in progress and explain what remains.

Start and finish are safe to retry. IDs remain stable when tasks are completed or reopened. Nora owns task file locations, completion flags, board positions and assignments; use the tools instead of moving files or editing board metadata yourself. If a tool fails, report the failure instead of claiming the status changed.

## Task board

- `list_tasks` finds task IDs, titles, paths and columns in this workspace.
- `create_task` takes `title` and optional Markdown `details` describing the goal, context and completion criteria; it returns the new task's ID.
- `move_task` takes a `path` from `list_tasks` and a column ID or title to organize the board. Use `start_task` and `finish_task` for lifecycle changes: moving a card alone does not change completion status.

## Other Nora workflows

Discover the tools available on the `nora` server and use their schemas for app operations. Nora conversations can manage bots, settings, workspaces and threads. Bot conversations can ask other bots for help and keep notes with `remember` and `recall`; group members can read earlier discussion with `group_history`.

Nora conversations can also manage workspace workflows: `list_workflows`, `create_workflow` and `update_workflow` save a writer agent plus optional reviewers; `run_workflow` starts one on an objective or a task ID (only when the user asks), and `read_workflow_run` and `control_workflow_run` check, pause, resume or cancel the run.

When a task needs a password, API key or token, never ask the user to paste it into chat: call `request_secret`, which opens a secure dialog and stores the value in the system keychain without showing it to you, then use it by name with `run_with_secrets` (the user approves each command, and secrets are redacted from its output). `list_secrets` shows what is already saved and `delete_secret` removes one.

Use `list_bots` to resolve a bot's name before `ask_bot`. Read current settings with `get_settings` before sending a focused `update_settings` patch. Use `list_threads` and `read_thread` to recover earlier work when needed. These tools manage Nora; they do not replace the coding tools used to perform a task.
