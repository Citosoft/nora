import { z } from "zod";
import type { NoraToolsStatus } from "@shared/types/nora-tools/noraTools.types";

/** Nora's own MCP tools: one source for what the runtime is told and what Settings shows. */
/** The MCP server name runtimes see for Nora's tools. */
export const NORA_MCP_SERVER = "nora";

/** `audience` says which threads get each tool: Nora threads, bots, plain workers, or bots answering in a chat ("member"). */
export const NORA_TOOLS = {
  report_workflow_stage: {
    audience: ["nora", "bot"],
    title: "Report a workflow stage result",
    description: "Workflow stage threads only: report this stage's outcome and a concise summary using the current attempt_id from its instructions. Work stages use complete or continue; review stages use approve or changes_requested. After a successful report, finish the turn. Nora advances only after the native turn completes successfully."
  },
  ask_bot: {
    audience: ["nora", "bot"],
    title: "Ask another bot",
    description: "Send a message to a bot (id or name from list_bots) in its own thread. Continues that bot's thread on repeat asks. "
      + "wait=notify (default) returns at once and Nora posts the bot's answer into this thread when it finishes; wait=reply blocks until the answer. "
      + "Use for @mentions or when another bot's role fits. Bots cannot ask themselves; ask chains are limited."
  },
  remember: {
    audience: ["nora", "bot", "worker"],
    title: "Remember something",
    description: "Save a short durable note (preference, decision, project fact). Pass memory_id to correct or merge a note you saved. "
      + "Newest notes appear in later threads; older ones via recall. Do not store secrets."
  },
  recall: {
    audience: ["nora", "bot", "worker"],
    title: "Search your notes",
    description: "Search notes saved with remember (this workspace and everywhere), best match first, with ids. Empty query lists newest notes."
  },
  forget: {
    audience: ["nora", "bot", "worker"],
    title: "Forget a note",
    description: "Delete one of your notes by id when it is wrong, out of date, or merged. User-written notes can only be changed by the user."
  },
  request_secret: {
    audience: ["nora", "bot", "worker"],
    title: "Ask for a secret",
    description: "Ask for a password, API key or token via Nora's secure dialog (never chat). Name it like an env var (GITHUB_TOKEN). "
      + "Check list_secrets first; a saved name is replaced."
  },
  list_secrets: {
    audience: ["nora", "bot", "worker"],
    title: "List saved secrets",
    description: "List secrets for this workspace and everywhere (name, purpose, scope). Values are never returned."
  },
  run_with_secrets: {
    audience: ["nora", "bot", "worker"],
    title: "Run a command with secrets",
    description: "Run a shell command in the workspace with saved secrets as env vars (user approves first). Reference as \"$NAME\" only; never print secrets. Use normal tools when no secret is needed."
  },
  delete_secret: {
    audience: ["nora", "bot", "worker"],
    title: "Delete a saved secret",
    description: "Delete a saved secret by name and scope (from list_secrets) when the user asks or it is invalid."
  },
  chat_history: {
    audience: ["member"],
    title: "Read the chat",
    description: "Read earlier messages of the group or direct chat you are answering in, newest last. "
      + "Your prompt only carries messages since you last spoke; use this for what was said before that."
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
  list_routines: {
    audience: ["nora"],
    title: "List a bot's routines",
    description: "List the scheduled routines for a bot (from list_bots), with each routine's id, name, schedule, timezone, whether it is active, "
      + "where runs land (chat or thread), missed-run policy and next run time."
  },
  create_routine: {
    audience: ["nora"],
    title: "Add a bot routine",
    description: "Add a scheduled routine to a bot (id from list_bots): a name, instruction for each run, schedule and where runs land. "
      + "Defaults to this thread's workspace and the machine timezone; workspace bots always run in their own workspace. "
      + "Schedules use the routine's timezone (daily/weekdays/weekly/monthly/hourly/once/custom cron, or interval). "
      + "Pass active false to save it paused. At most 20 routines per bot. Returns the new routine id."
  },
  update_routine: {
    audience: ["nora"],
    title: "Update a bot routine",
    description: "Change an existing routine by id (from list_routines); only the fields you pass change. "
      + "Use it to rename, rewrite the instruction, change the schedule or timezone, move between chat and thread, "
      + "change the missed-run policy, or pause/resume with active. The routine stays on the same bot."
  },
  remove_routine: {
    audience: ["nora"],
    title: "Remove a bot routine",
    description: "Delete one of a bot's routines by id (from list_routines). Stops unfinished runs of that routine. The bot itself is unchanged."
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
  list_terminals: {
    audience: ["nora"],
    title: "List open terminals",
    description: "List terminals open in this workspace (including the local dock). Use open_terminal then paste_terminal for the user to run commands; do not run shell via these tools."
  },
  open_terminal: {
    audience: ["nora"],
    title: "Open a terminal",
    description: "Open the local terminal dock or a new workspace terminal. Returns an id for paste_terminal. Prefer when the user should run commands themselves."
  },
  paste_terminal: {
    audience: ["nora"],
    title: "Paste into a terminal",
    description: "Paste text into an open terminal by id without pressing Enter, so the user can review and run it."
  },
  list_models: {
    audience: ["nora", "bot"],
    title: "List providers and models",
    description: "List the installed providers (such as claude and codex), their models and whether they enforce read-only worker commands."
  },
  list_threads: {
    audience: ["nora", "bot", "worker"],
    title: "List Nora threads",
    description: "List threads in this workspace (or every workspace), newest first, with id, title, bot, status and last activity. "
      + "A bot sees its own threads and the workers it started. Settled threads are left out unless you ask for them."
  },
  read_thread: {
    audience: ["nora", "bot", "worker"],
    title: "Read a Nora thread",
    description: "Read the latest messages of another thread by id (from list_threads): what was asked and the final answers, without tool output."
  },
  start_thread: {
    audience: ["nora", "bot"],
    title: "Start a worker thread",
    description: "Start a background worker with a self-contained prompt and done criteria; returns its id immediately. "
      + "Defaults to your bot/model; or pass provider/model or a bot from list_bots. "
      + "Write workers in Git get an isolated worktree by default (isolation shared uses the caller's checkout). "
      + "Read workers share the checkout under the provider's read-only sandbox. Collect reports with wait_for_threads."
  },
  message_thread: {
    audience: ["nora", "bot"],
    title: "Message a worker thread",
    description: "Send a follow-up to one of this thread's workers by id (from start_thread) and return at once. Collect the answer with wait_for_threads."
  },
  wait_for_threads: {
    audience: ["nora", "bot"],
    title: "Wait for worker threads",
    description: "Wait until workers (by id, or all when omitted) finish; returns status and final report. "
      + "Default waits for all; mode any returns on the first. Returns early on approval/input needs or after timeout_minutes (max 15)."
  },
  list_tasks: {
    audience: ["nora", "bot", "member", "worker"],
    title: "List workspace tasks",
    description: "List this workspace's tasks (id, path, title, column) with a Markdown link that opens each in Nora. Include those links when referring the user to tasks."
  },
  create_task: {
    audience: ["nora", "bot", "member", "worker"],
    title: "Create a workspace task",
    description: "Add a task to the board (Markdown under .nora/tasks). Always include the returned Markdown task link in your reply to the user."
  },
  read_task: {
    audience: ["nora", "bot", "member", "worker"],
    title: "Read a workspace task",
    description: "Read a task's details, status and open-in-Nora link by id from list_tasks or a handoff."
  },
  start_task: {
    audience: ["nora", "bot", "member", "worker"],
    title: "Start a workspace task",
    description: "Start or reopen a task by id (incomplete, In Progress). Safe to retry."
  },
  finish_task: {
    audience: ["nora", "bot", "member", "worker"],
    title: "Finish a workspace task",
    description: "Mark a task complete by id and move it to Done after its criteria are satisfied. Safe to retry."
  },
  move_task: {
    audience: ["nora", "bot", "member", "worker"],
    title: "Move a workspace task",
    description: "Move a task to another column by path (from list_tasks) and column id or title."
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
  },
  app_builder_guide: {
    audience: ["nora"],
    title: "How to build a Nora app",
    description: "Read the guide for building apps: dashboards and mini apps over the user's connectors that live in Nora's Apps section. "
      + "It lists every UI component and action an app may use and how sources, select expressions and actions fit together. Read it before create_app or update_app."
  },
  list_connector_tools: {
    audience: ["nora"],
    title: "List connector tools for apps",
    description: "List the connectors an app built from this thread may use, with each tool's name, description and input schema. Pass connector_id to see one connector's tools in full."
  },
  sample_connector_tool: {
    audience: ["nora"],
    title: "Sample a connector tool for an app source",
    description: "Call a connector tool once with the arguments an app source would use and see what it returns, shaped exactly as a source's select expression sees it. "
      + "Nora keeps the result as that source's sample, so create_app and update_app can check the expression against real data. Keep results small with limits or filters."
  },
  sample_file: {
    audience: ["nora"],
    title: "Sample a file for an app source",
    description: "Read a CSV, TSV or JSON file on this computer the way an app source will see it (CSV and TSV as one object per row, headed by the first line) and keep the result as that source's sample. "
      + "Paths are absolute or start with ~. The app re-reads the file whenever it changes."
  },
  create_app: {
    audience: ["nora"],
    title: "Create a Nora app",
    description: "Save a new app from a complete spec: its sources (connector tool calls with a select expression), its actions and its UI. "
      + "Every source must have been sampled first. Returns the app's id, or every problem found so you can fix them in one pass. The app appears in Apps at once."
  },
  update_app: {
    audience: ["nora"],
    title: "Update a Nora app",
    description: "Replace an app's spec with a new complete version and describe the change in one line; the previous version is kept and can be restored. "
      + "Start from the app's current spec (the one you last saved in this thread, or read_app when you have not seen it) and change only what the user asked for. "
      + "Pass that spec's version as base_version; if the app has changed since, the save is refused so nothing is overwritten."
  },
  read_app: {
    audience: ["nora"],
    title: "Read a Nora app",
    description: "Read an app's current spec, version and the state of each source (loaded, failing, or waiting on a sign-in), by id."
  }
} as const;

export const noraToolsStatusSchema = z.object({
  /** Running once the first Nora thread has started its loopback server this session. */
  status: z.enum(["idle", "running"]),
  tools: z.array(z.object({ name: z.string().min(1), description: z.string(), audience: z.array(z.enum(["nora", "bot", "worker", "member"])) }).strict())
}).strict();

export function noraToolsStatus(status: NoraToolsStatus["status"]): NoraToolsStatus {
  return { status, tools: Object.entries(NORA_TOOLS).map(([name, tool]) => ({ name, description: tool.description, audience: [...tool.audience] })) };
}
