import { z } from "zod";
import type { NoraToolsStatus } from "@shared/types/nora-tools/noraTools.types";

/** Nora's own MCP tools: one source for what the runtime is told and what Settings shows. */
/** The MCP server name runtimes see for Nora's tools. */
export const NORA_MCP_SERVER = "nora";

/** `audience` says which threads get each tool: Nora (bot-less) threads, bot threads, and bot threads answering in a group chat ("member"). */
export const NORA_TOOLS = {
  ask_bot: {
    audience: ["nora", "bot"],
    title: "Ask another bot",
    description: "Send a message to a bot (by id or name from list_bots) and wait for its reply. The bot answers in its own thread, "
      + "with its own instructions, model and permissions and read-only access to this workspace; asking the same bot again continues that thread. "
      + "Use it when the user @mentions a bot or when another bot's role fits the work. Bots cannot ask themselves, and chains of asks are limited."
  },
  remember: {
    audience: ["bot"],
    title: "Remember something",
    description: "Save a short, durable note for yourself (this bot), such as a user preference, a decision or a project fact. "
      + "Notes appear in your instructions in later threads and the user can see and edit them. Do not store secrets."
  },
  recall: {
    audience: ["bot"],
    title: "Search your notes",
    description: "Search the notes you saved with remember, for this workspace and everywhere."
  },
  group_history: {
    audience: ["member"],
    title: "Read the group chat",
    description: "Read earlier messages of the group chat you are answering in, newest last, with who wrote each one. "
      + "Your prompt only carries messages since you last spoke; use this when you need what was said before that."
  },
  create_bot: {
    audience: ["nora"],
    title: "Create a Nora bot",
    description: "Create a bot in Nora: a named teammate with a role, standing instructions, its own model and an animated avatar. "
      + "It is saved immediately and appears in the Bots sidebar and the Talk to picker. Omit provider and model to use this thread's model "
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
    audience: ["nora"],
    title: "List Nora threads",
    description: "List threads in this workspace (or every workspace), newest first, with id, title, bot, status and last activity. "
      + "Settled threads are left out unless you ask for them."
  },
  read_thread: {
    audience: ["nora"],
    title: "Read a Nora thread",
    description: "Read the latest messages of another Nora thread by id (from list_threads): what the user asked and the final answers, "
      + "without tool output. Use it to pick up context from earlier work."
  },
  list_tasks: {
    audience: ["nora"],
    title: "List workspace tasks",
    description: "List the tasks on this workspace's task board, with their path, title and column (such as Todo, In Progress or Done)."
  },
  create_task: {
    audience: ["nora"],
    title: "Create a workspace task",
    description: "Add a task to this workspace's task board, in the first column. It is saved as a Markdown file under .nora/tasks "
      + "with the title as its heading and your details as the body."
  },
  move_task: {
    audience: ["nora"],
    title: "Move a workspace task",
    description: "Move a task to another column of this workspace's task board, by its path (from list_tasks) and the column's id or title."
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
