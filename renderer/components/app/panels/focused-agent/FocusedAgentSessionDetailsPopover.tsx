import { formatAgentMode } from "@/components/app/logic/utils";
import type { FocusedAgentSessionDetailsPopoverProps } from "@/components/app/types/focusedAgentSessionChrome.types";
import { AgentInfoRow } from "@/components/app/panels/focused-agent/AgentInfoRow";
import { Bot, FolderGit2, GitBranch, Sparkles, TerminalSquare } from "lucide-react";

export const FocusedAgentSessionDetailsPopover = ({
  infoPopoverRef,
  agent,
  terminal
}: FocusedAgentSessionDetailsPopoverProps) => (
  <div
    ref={infoPopoverRef}
    className="absolute right-6 top-14 z-30 w-[min(92vw,720px)] border border-border/70 bg-popover/95 p-4 shadow-2xl backdrop-blur"
  >
    <div className="space-y-3 text-sm">
      {agent ? <AgentInfoRow icon={Bot} label="Tool" value={agent.toolLabel} /> : null}
      {agent ? <AgentInfoRow icon={Sparkles} label="Mode" value={formatAgentMode(agent.mode)} /> : null}
      <AgentInfoRow icon={GitBranch} label="Branch" value={(agent || terminal)?.branch || ""} />
      {terminal ? <AgentInfoRow icon={TerminalSquare} label="Shell" value={terminal.shellLabel} /> : null}
      <AgentInfoRow icon={FolderGit2} label="Workspace" value={(agent || terminal)?.workspace || ""} />
      <AgentInfoRow icon={TerminalSquare} label="Command" value={(agent || terminal)?.command || ""} />
    </div>
  </div>
);
