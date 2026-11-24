import { useMemo, useState } from "react";
import { useBotInfo } from "@/components/app/hooks/useBotInfo";
import { useThreadNavigationPorts } from "@/components/app/hooks/useThreadNavigationPorts";
import { useThreadTime } from "@/components/app/hooks/useThreadTime";
import { useWorkspaceBotRoster } from "@/components/app/hooks/useWorkspaceBotRoster";
import { botStartLabel, buildBotNavigation } from "@/components/app/logic/botNavigation";
import { AppMark } from "@/components/app/shared/AppMark";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { Button } from "@/components/ui/button";
import { BotNavigationRow } from "./BotNavigationRow";
import { ThreadRow } from "@/components/app/panels/threads/ThreadRow";
import { WorkThreadsToggle } from "@/components/app/panels/threads/WorkThreadsToggle";
import { GROUP_MEMBERS_MIN } from "@shared/bots/contracts";
import { Plus } from "lucide-react";
import type { BotNavigationProps } from "@/components/app/types/botNavigation.types";
import type { ThreadNavigationRow } from "@/components/app/types/thread-workspace/ports.types";

/** Bots mode: the workspace's bots, then global bots, each with its own threads. */
export function BotNavigation({ workspaceId, workspaceName, query, collapsed, onStart, onNavigate, onShowThreads, onNewGroup }: BotNavigationProps) {
  const ports = useThreadNavigationPorts();
  const now = useThreadTime();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const botInfo = useBotInfo();
  const { bots, rows } = useWorkspaceBotRoster(ports.state, workspaceId);
  const groups = useMemo(() => buildBotNavigation(bots, rows, query, workspaceName), [bots, rows, query, workspaceName]);
  const groupThreads = useMemo(() => rows.filter((row) => row.group && (!query.trim() || `${row.title} ${row.group.map((member) => member.name).join(" ")}`
    .toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [rows, query]);
  const open = (row: ThreadNavigationRow): void => { onNavigate(); ports.openRow(row); };
  const togglePin = (row: ThreadNavigationRow): void => { if (row.target.kind === "thread") ports.togglePin(row.target.conversationId); };
  const setSettled = (row: ThreadNavigationRow, settled: boolean): void => {
    // A refused settle (work still running) leaves the row as it was; refreshing shows the true state.
    if (row.target.kind === "thread") void ports.setSettled({ kind: "thread", conversationId: row.target.conversationId }, settled).catch(() => ports.refresh());
  };
  const rename = (row: ThreadNavigationRow, title: string): Promise<void> =>
    row.target.kind === "thread" ? ports.renameThread(row.target.conversationId, title) : Promise.resolve();
  const discardDraft = (row: ThreadNavigationRow): void => { if (row.target.kind === "draft") ports.discardDraft(row.target.documentId); };
  const toggle = (botId: string): void => setExpanded((current) => {
    const next = new Set(current);
    if (!next.delete(botId)) next.add(botId);
    return next;
  });
  if (collapsed) {
    return <nav aria-label="Bots" className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto py-1">
      {groups.flatMap((group) => group.items).map(({ id, name, avatar, state }) => <Button key={id} type="button" variant="ghost" size="icon" className="size-9"
        aria-label={botStartLabel({ name })} tooltip={name} onClick={() => onStart(id)}>
        {avatar ? <BotAvatar avatar={avatar} state={state} size={28} /> : <AppMark className="size-6 shrink-0" />}</Button>)}
    </nav>;
  }
  return <nav aria-label="Bots" className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1.5 pb-2">
    {groups.map((group) => <section key={group.id} aria-labelledby={group.label ? `bot-group-${group.id}` : undefined} aria-label={group.label ? undefined : "Nora"}>
      {group.label && <h3 id={`bot-group-${group.id}`} className="flex items-center gap-2 px-2 pb-1 pt-2 text-[10px] font-medium text-muted-foreground">
        <span className="min-w-0 flex-1 truncate">{group.label}</span><span className="text-[9px] tabular-nums">{group.items.length}</span></h3>}
      <ul className="space-y-0.5">{group.items.map((item) => <BotNavigationRow key={item.id} item={item} now={now} expanded={expanded.has(item.id)}
        onToggle={() => toggle(item.id)} onStart={() => onStart(item.id)} onOpen={open} onTogglePin={togglePin} onShowAllThreads={onShowThreads}
        onShowInfo={botInfo ? () => botInfo.show(item.id) : undefined}
        onEdit={item.origin === "built-in" || !botInfo ? undefined : () => botInfo.edit(item.id)}
        onDelete={item.origin === "built-in" || !botInfo ? undefined : () => botInfo.remove(item.id)} />)}</ul>
    </section>)}
    {(groupThreads.length > 0 || (onNewGroup && bots.length >= GROUP_MEMBERS_MIN && !query)) && <section aria-labelledby="bot-group-chats">
      <h3 id="bot-group-chats" className="flex items-center gap-2 px-2 pb-1 pt-2 text-[10px] font-medium text-muted-foreground">
        <span className="min-w-0 flex-1 truncate">Groups</span>
        {groupThreads.length > 0 && <WorkThreadsToggle compact />}
        {onNewGroup && <Button type="button" variant="ghost" size="icon" className="size-5 text-muted-foreground" aria-label="New group" tooltip="New group" onClick={onNewGroup}>
          <Plus className="size-3" aria-hidden="true" /></Button>}</h3>
      {groupThreads.length ? <div className="space-y-0.5">{groupThreads.map((row) => <ThreadRow key={row.id} row={row} now={now} workspace={null} request={null}
        onOpen={open} onTogglePin={togglePin} onSetSettled={setSettled} onRename={rename} onDiscardDraft={discardDraft} />)}</div>
        : <p className="px-2 py-1 text-xs text-muted-foreground">Start a group to have several bots work on something together.</p>}
    </section>}
    {!groups.length && !groupThreads.length && <p role="status" className="px-2 py-4 text-xs text-muted-foreground">No matching bots.</p>}
    {!query && !bots.length && <p className="px-2 py-2 text-xs text-muted-foreground">Create a bot with New bot, or ask Nora to make one for you.</p>}
  </nav>;
}
