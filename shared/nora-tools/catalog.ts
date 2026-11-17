import { z } from "zod";
import type { NoraToolsStatus } from "@shared/types/nora-tools/noraTools.types";

/** Nora's own MCP tools: one source for what the runtime is told and what Settings shows. */
/** The MCP server name runtimes see for Nora's tools. */
export const NORA_MCP_SERVER = "nora";

/** `audience` says which threads get each tool: Nora (bot-less) threads, bot threads, and bot threads answering in a group chat ("member"). */
export const NORA_TOOLS = {
  report_workflow_stage: {
    audience: ["nora", "bot"],
    title: "Report a workflow stage result",
    description: "Workflow stage threads only: report this stage's outcome and a concise summary using the current attempt_id from its instructions. Work stages use complete or continue; review stages use approve or changes_requested. After a successful report, finish the turn. Nora advances only after the native turn completes successfully."
  },
  ask_bot: {
    audience: ["nora", "bot"],
    title: "Ask another bot",
    description: "Send a message to a bot (by id or name from list_bots) and wait for its reply. The bot answers in its own thread, "
      + "with its own instructions, model and permissions and read-only access to this workspace; asking the same bot again continues that thread. "
      + "Use it when the user @mentions a bot or when another bot's role fits the work. Bots cannot ask themselves, and chains of asks are limited."
  },
  remember: {
    audience: ["nora", "bot"],
    title: "Remember something",
    description: "Save a short, durable note for yourself, such as a user preference, a decision or a project fact. "
      + "To correct or merge a note you saved, pass its id as memory_id instead of adding a near-duplicate. "
      + "Your newest notes are included in every later thread; older ones stay searchable with recall. The user can see and edit them. Do not store secrets."
  },
  recall: {
    audience: ["nora", "bot"],
    title: "Search your notes",
    description: "Search the notes you saved with remember, for this workspace and everywhere, best match first, with each note's id. "
      + "An empty query lists your newest notes."
  },
  forget: {
    audience: ["nora", "bot"],
    title: "Forget a note",
    description: "Delete one of the notes you saved, by its id, when it turns out wrong or out of date, or after you merged it into another. "
      + "Notes the user wrote can only be changed by the user."
  },
  chat_history: {
    audience: ["member"],
    title: "Read the chat",
    description: "Read earlier messages of the group or direct chat you are answering in, newest last, with who wrote each one. "
      + "Your prompt only carries messages since you last spoke; use this when you need what was said before that."
  },
  create_bot: {
    audience: ["nora"],
    title: "Create a Nora bot",
    description: "Create a bot in Nora: a named teammate with a role, standing instructions, its own model and an animated avatar. "
      + "It is saved immediately and appears in the Bots sidebar, ready to chat with. Omit provider and model to use this thread's model "
      + "(call list_models to see the alternatives). Write instructions in the second person, as guidance for the bot."
  },
  update_bot: {
    audience: ["nora"],
    title: "Update a Nora bot",
    description: "Change an existing bot's name, role, instructions, model or avatar; only the fields you pass change. "
      + "Changes apply to new threads with the bot; existing threads keep the instructions they started with. Find ids with list_bots."
  },
  list_bots: {
    audience: ["nora", "bot"],
    title: "List Nora bots",
    description: "List the bots available in this thread's workspace, with their id, role, model and where they are available."
  },
  get_settings: {
    audience: ["nora"],
    title: "Read Nora settings",
    description: "Read all Nora app settings, including appearance, general preferences, AI and voice configuration, integration settings, personalization, thread defaults and sync."
  },
  update_settings: {
    audience: ["nora"],
    title: "Change Nora settings",
    description: "Change any Nora app setting. Pass only fields to change under appearance, general, local, personalization or threads, or set syncEnabled. AI, voice and terminal defaults merge; arrays and keyed maps replace. Other settings are preserved. "
      + "Use get_settings first to see current values and list_models for provider instance IDs. Null resets model defaults. "
      + "Hardware acceleration requires an app restart; thread defaults apply to subsequent runs or new threads as appropriate. Returns the saved settings. Example: {appearance: {themeMode: 'dark'}}."
  },
  list_workspaces: {
    audience: ["nora"],
    title: "List Nora workspaces",
    description: "List the workspaces open in Nora, with their kind, folder and Git branch, and mark the one this thread belongs to."
  },
  list_models: {
    audience: ["nora"],
    title: "List providers and models",
    description: "List the installed providers (such as claude and codex) and the models each one offers, for choosing a bot's model."
  },
  list_threads: {
    audience: ["nora", "bot"],
    title: "List Nora threads",
    description: "List threads in this workspace (or every workspace), newest first, with id, title, bot, status and last activity. "
      + "A bot sees only its own threads. Settled threads are left out unless you ask for them."
  },
  read_thread: {
    audience: ["nora", "bot"],
    title: "Read a Nora thread",
    description: "Read the latest messages of another thread by id (from list_threads): what the user asked and the final answers, "
      + "without tool output. Use it to pick up context from earlier work."
  },
  list_tasks: {
    audience: ["nora", "bot", "member"],
    title: "List workspace tasks",
    description: "List the tasks on this workspace's task board, with their stable id, path, title and column (such as Todo, In Progress or Done)."
  },
  create_task: {
    audience: ["nora", "bot", "member"],
    title: "Create a workspace task",
    description: "Add a task to this workspace's task board, in the first column. It is saved as a Markdown file under .nora/tasks "
      + "with the title as its heading and your details as the body."
  },
  read_task: {
    audience: ["nora", "bot", "member"],
    title: "Read a workspace task",
    description: "Read a task's current details and status by its stable id from list_tasks or a task handoff."
  },
  start_task: {
    audience: ["nora", "bot", "member"],
    title: "Start a workspace task",
    description: "Start or reopen a task by its stable id, marking it incomplete and moving it to In Progress. Safe to retry."
  },
  finish_task: {
    audience: ["nora", "bot", "member"],
    title: "Finish a workspace task",
    description: "Mark a task complete by its stable id and move it to Done. Call only after the task's completion criteria and validation are satisfied. Safe to retry."
  },
  move_task: {
    audience: ["nora", "bot", "member"],
    title: "Move a workspace task",
    description: "Move a task to another column of this workspace's task board, by its path (from list_tasks) and the column's id or title."
  },
  list_workflows: {
    audience: ["nora"],
    title: "List workspace workflows",
    description: "List this workspace's saved workflows (ordered work and review stages assigned to agents or saved bots), "
      + "with each one's id, agents, limits and latest run."
  },
  create_workflow: {
    audience: ["nora"],
    title: "Create a workspace workflow",
    description: "Save a reusable workflow in this workspace: any number of ordered work and review stages assigned to agents or saved bots, "
      + "repeating until every work stage completes and every review approves, or a limit is reached. Each stage runs in its own persistent thread. Agents are installed provider kinds or instance ids such as claude or codex (omit to use this thread's provider); "
      + "omit model to use the runtime default. Use reworkStageId to return to an earlier work stage; omit it to return to stage 1. Write instructions in the second person. It appears in the Workflows tool at once; start it with run_workflow."
  },
  update_workflow: {
    audience: ["nora"],
    title: "Update a workspace workflow",
    description: "Change a saved workflow's name, description, stages or limits by id (from list_workflows); only the fields you pass change. "
      + "Stages, when passed, replace the complete ordered list; at least one is required. Runs already started keep the version they started with."
  },
  run_workflow: {
    audience: ["nora"],
    title: "Run a workspace workflow",
    description: "Start a saved workflow on a goal: an objective, a task from list_tasks, or both. It runs in the background in a new managed worktree "
      + "(or the project folder when the workspace is not a Git repository), and needs this thread's workspace to be the one open in Nora. "
      + "Returns the run id; check progress with read_workflow_run. Only start a run when the user asked for it."
  },
  read_workflow_run: {
    audience: ["nora"],
    title: "Read a workflow run",
    description: "Read a workflow run's status, iteration, where it runs, each role's latest outcome and summary, and its recent events, by run id."
  },
  control_workflow_run: {
    audience: ["nora"],
    title: "Pause, resume or cancel a workflow run",
    description: "Pause a running workflow run (it stops after the current agent turn), resume a paused one, or cancel it for good, by run id. "
      + "Its worktree and changes are kept either way."
  }
} as const;

export const noraToolsStatusSchema = z.object({
  /** Running once the first Nora thread has started its loopback server this session. */
  status: z.enum(["idle", "running"]),
  tools: z.array(z.object({ name: z.string().min(1), description: z.string(), audience: z.array(z.enum(["nora", "bot", "member"])) }).strict())
}).strict();

export function noraToolsStatus(status: NoraToolsStatus["status"]): NoraToolsStatus {
  return { status, tools: Object.entries(NORA_TOOLS).map(([name, tool]) => ({ name, description: tool.description, audience: [...tool.audience] })) };
}
