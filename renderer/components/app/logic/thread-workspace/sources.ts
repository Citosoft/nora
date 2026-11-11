import { z } from "zod";
import type { ThreadSourceOption, ThreadSourceFilter } from "@/components/app/types/thread-workspace/list.types";
import type { ThreadNavigationRow } from "@/components/app/types/thread-workspace/ports.types";

export const threadSourceFilterSchema = z.enum(["all", "nora", "external", "codex-cli", "codex-desktop", "claude-cli", "claude-desktop"]);
export const threadSourceOptions: readonly ThreadSourceOption[] = [
  { id: "all", label: "All chats", providerKind: null },
  { id: "nora", label: "Nora", providerKind: null },
  { id: "external", label: "All other apps", providerKind: null },
  { id: "codex-cli", label: "Codex CLI", providerKind: "codex" },
  { id: "codex-desktop", label: "Codex Desktop", providerKind: "codex" },
  { id: "claude-cli", label: "Claude Code CLI", providerKind: "claude" },
  { id: "claude-desktop", label: "Claude Desktop", providerKind: "claude" }
];

export function threadAppSource(row: Pick<ThreadNavigationRow, "origin" | "providerKind">): Exclude<ThreadSourceFilter, "all"> {
  if (!row.origin) return "nora";
  if (row.providerKind === "codex") return row.origin === "desktop" ? "codex-desktop" : "codex-cli";
  if (row.providerKind === "claude") return row.origin === "desktop" ? "claude-desktop" : "claude-cli";
  return "external";
}

export function matchesThreadSource(row: Pick<ThreadNavigationRow, "origin" | "providerKind">, source: ThreadSourceFilter): boolean {
  return source === "all" || (source === "external" ? !!row.origin : threadAppSource(row) === source);
}
