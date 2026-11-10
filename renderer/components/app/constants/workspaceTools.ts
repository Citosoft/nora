import { Files, FolderKanban, GitBranch, GitPullRequest, Globe, NotebookPen, Repeat2, TerminalSquare } from "lucide-react";
import type { WorkspaceToolItem } from "@/components/app/types/workspaceNavigation.types";

export const WORKSPACE_TOOLS: readonly WorkspaceToolItem[] = [
  { id: "files", label: "Files", icon: Files },
  { id: "changes", label: "Changes", icon: GitPullRequest },
  { id: "documents", label: "Documents", icon: NotebookPen },
  { id: "tasks", label: "Tasks", icon: FolderKanban },
  { id: "development", label: "Development", icon: GitBranch },
  { id: "workflows", label: "Workflows", icon: Repeat2 },
  { id: "terminals", label: "Terminals", icon: TerminalSquare },
  { id: "browser", label: "Browser", icon: Globe }
];
