import { ThreadRowContextMenu } from "./ThreadRowContextMenu";
import { ThreadAgePinSlot } from "./ThreadAgePinSlot";
import { GitPullRequest, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { ThreadStatusIcon } from "./ThreadStatusIcon";
import { ThreadTitle } from "./ThreadTitle";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { botAvatarStateForStatus, memberList } from "@/components/app/logic/botThreads";
import { BotAvatarStack } from "@/components/app/shared/BotAvatarStack";
import type { ThreadRowProps } from "@/components/app/types/thread-workspace/ports.types";

export function ThreadRow({ row, workspace, request, onOpen, onTogglePin, onSetSettled, onRename, now = Date.now() }: ThreadRowProps) {
  const pending = row.target.kind === "external" ? row.target.pending : null;
  const disabled = row.target.kind === "external" && row.target.disabled;
  const linkedRequest = request?.pullRequestNumber ? request : null;
  const requestLabel = linkedRequest ? `PR / MR #${linkedRequest.pullRequestNumber} · ${linkedRequest.label}` : null;
  const timestamp = Date.parse(row.updatedAt);
  const activityDate = Number.isFinite(timestamp) ? `\nLast activity ${new Date(timestamp).toLocaleString()}` : "";
  const stateLabel = row.waitingOn ? `, ${row.waitingOn.name} is waiting for you` : row.attention || row.status === "Interrupted" ? `, ${row.status.toLocaleLowerCase()}` : "";
  const waitingOn = row.waitingOn;
  return <ThreadRowContextMenu row={row} onSetSettled={onSetSettled} onRename={onRename}><div className={`group flex items-center rounded-md ${row.selected ? "bg-secondary" : "hover:bg-muted"}`}>
    <Tooltip content={`${row.title}\n${workspace ? `${workspace.name} · ` : ""}${row.status}${requestLabel ? ` · ${requestLabel}` : ""}${activityDate}`} triggerClassName="flex min-w-0 flex-1">
      <button type="button" disabled={disabled} aria-label={`Open ${row.title}${workspace ? `, workspace ${workspace.name}` : ""}${stateLabel}${row.unread ? ", unread completion" : ""}${requestLabel ? `, ${requestLabel}` : ""}`} aria-current={row.selected ? "page" : undefined}
        onClick={() => onOpen(row)} className="thread-row-open flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
        {row.group ? <BotAvatarStack members={row.group} size={20} label={`Group: ${memberList(row.group.map((member) => member.name))}`} />
          : row.bot ? <BotAvatar avatar={row.bot.avatar} state={botAvatarStateForStatus(row.status)} size={20} label={row.bot.name} className="shrink-0" />
          : row.providerKind && <AgentToolIcon toolId={row.providerKind} label={row.providerKind} className="size-5 shrink-0" imageClassName="size-4" />}
        <ThreadTitle title={pending === "open" ? "Opening…" : pending === "pin" ? "Pinning…" : row.title} unread={row.unread} />
        {requestLabel && <GitPullRequest role="img" aria-label={requestLabel} className="size-3.5 shrink-0 text-muted-foreground" />}
        <ThreadStatusIcon row={row} />
      </button>
    </Tooltip>
    {waitingOn && <Button type="button" variant="ghost" size="sm" className="h-6 shrink-0 gap-1 px-1.5 text-[11px] text-amber-600 hover:text-amber-700 dark:text-amber-400"
      aria-label={`Open ${waitingOn.name}'s thread, waiting for your approval or answer`} tooltip={`${waitingOn.name} is waiting for you`}
      onClick={() => onOpen({ ...row, id: waitingOn.conversationId, target: { kind: "thread", conversationId: waitingOn.conversationId }, waitingOn: null })}>
      <ShieldQuestion className="size-3" aria-hidden="true" /><span className="max-w-20 truncate">{waitingOn.name}</span></Button>}
    <ThreadAgePinSlot updatedAt={row.updatedAt} now={now} title={row.title} pinned={row.pinned}
      onTogglePin={row.target.kind === "draft" ? null : () => onTogglePin(row)} disabled={disabled} />
  </div></ThreadRowContextMenu>;
}
