import { AgentToolIcon } from "@/components/app/shared/Tooling";
import type { WorkspaceSessionTabIconProps } from "@/components/app/types/sessionTabOverflow.types";
import { Expand, FileText, GitPullRequest, Globe, LayoutPanelTop, MessageSquare, TerminalSquare } from "lucide-react";

export function WorkspaceSessionTabIcon({ tab }: WorkspaceSessionTabIconProps) {
  switch (tab.kind) {
    case "agent":
      return <AgentToolIcon toolId={tab.toolId} label={tab.toolLabel} className="size-4 shrink-0 rounded-sm bg-transparent" imageClassName="size-4 rounded-sm" />;
    case "terminal":
      return <TerminalSquare className="size-4 shrink-0" />;
    case "forge":
      return <GitPullRequest className="size-4 shrink-0" />;
    case "thread":
      return <MessageSquare className="size-4 shrink-0" />;
    case "view":
      return <LayoutPanelTop className="size-4 shrink-0" />;
    case "file":
      return <FileText className="size-4 shrink-0" />;
    case "diff":
      return <Expand className="size-4 shrink-0" />;
    case "browser":
      return tab.faviconUrl
        ? <img src={tab.faviconUrl} alt="" className="size-4 shrink-0 rounded-sm object-contain" />
        : <Globe className="size-4 shrink-0" />;
  }
}
