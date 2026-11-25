import type {
  NoraTerminalInfo,
  NoraTerminalOperations,
  NoraToolContext,
  OpenNoraTerminalInput
} from "@main/types/nora-tools/noraTools.types";
import type { NoraToolOperationOptions } from "@main/types/nora-tools/operations.types";
import { shellProjectOf } from "./shellProject";

function describeTerminal(terminal: NoraTerminalInfo): string {
  const details = [
    `id ${terminal.id}`,
    `kind ${terminal.kind}`,
    `status ${terminal.status}`,
    `host ${terminal.host}`,
    `cwd ${terminal.cwd}`,
    terminal.branch ? `branch ${terminal.branch}` : null,
    terminal.busy ? "busy" : null,
    terminal.lastLine ? `last ${JSON.stringify(terminal.lastLine)}` : null
  ].filter((part): part is string => !!part);
  return `- ${terminal.name} (${details.join("; ")})`;
}

function unavailable(): never {
  throw new Error("Terminals are unavailable in this environment.");
}

export function formatTerminalList(terminals: readonly NoraTerminalInfo[]): string {
  if (!terminals.length) {
    return "No terminals are open. Call open_terminal for the local dock or a workspace terminal, then try again.";
  }
  return terminals.map(describeTerminal).join("\n");
}

export function formatTerminalOpen(terminal: NoraTerminalInfo): string {
  return `Opened ${terminal.name} (id ${terminal.id}; kind ${terminal.kind}). Paste with paste_terminal using this id.`;
}

export function formatTerminalPaste(terminal: NoraTerminalInfo, text: string): string {
  return `Pasted into ${terminal.name} (id ${terminal.id}) without pressing Enter (${text.length} characters). Ask the user to review and run it.`;
}

/** Strips one trailing newline so a model-supplied command does not submit on paste. */
export function pasteTextWithoutSubmit(text: string): string {
  const trimmed = text.replace(/(?:\r\n|\n|\r)$/u, "");
  if (!trimmed) throw new Error("Paste text must not be empty.");
  return trimmed;
}

export function createTerminalOperations(options: NoraToolOperationOptions): NoraTerminalOperations {
  const store = options.terminals;
  return {
    list(context) {
      if (!store) unavailable();
      return store.list(shellProjectOf(options, context)?.id ?? null);
    },
    async open(input: OpenNoraTerminalInput, context) {
      if (!store) unavailable();
      if (input.kind === "local") {
        return store.open({ kind: "local" });
      }
      const shellProject = shellProjectOf(options, context);
      if (!shellProject) {
        throw new Error("This workspace has no project terminal surface. Open a project workspace in Nora, or use kind local.");
      }
      return store.open({ kind: "workspace", shellProjectId: shellProject.id, ...(input.name ? { name: input.name } : {}) });
    },
    async paste(id, text, context: NoraToolContext) {
      if (!store) unavailable();
      const payload = pasteTextWithoutSubmit(text);
      const terminals = store.list(shellProjectOf(options, context)?.id ?? null);
      if (!terminals.some((terminal) => terminal.id === id)) {
        throw new Error("Terminal could not be found. Call list_terminals for the open ids.");
      }
      return store.paste(id, payload);
    }
  };
}
