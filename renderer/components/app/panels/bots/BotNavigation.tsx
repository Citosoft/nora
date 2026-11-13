import { useMemo, useState } from "react";
import { effectiveBots, knownBotIds } from "@shared/bots/catalog";
import { buildBotInfo } from "@/components/app/logic/botInfo";
import { BotInfoPanel } from "./BotInfoPanel";
import { DeleteBotDialog } from "./DeleteBotDialog";
import { BotEditorDialog } from "@/components/app/panels/settings/bots/BotEditorDialog";
import { useThreadNavigationPorts } from "@/components/app/hooks/useThreadNavigationPorts";
import { useThreadTime } from "@/components/app/hooks/useThreadTime";
import { applyMemberThreadVisibility, buildThreadNavigation } from "@/components/app/logic/thread-workspace/navigation";
import { useMemberThreadVisibility } from "@/components/app/hooks/useMemberThreadVisibility";
import { buildBotNavigation, NORA_ASSISTANT } from "@/components/app/logic/botNavigation";
import { AppMark } from "@/components/app/shared/AppMark";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { Button } from "@/components/ui/button";
import { BotNavigationRow } from "./BotNavigationRow";
import { ThreadRow } from "@/components/app/panels/threads/ThreadRow";
import { MemberThreadsToggle } from "@/components/app/panels/threads/MemberThreadsToggle";
import { GROUP_MEMBERS_MIN } from "@shared/bots/contracts";
import { Plus } from "lucide-react";
import type { BotNavigationProps } from "@/components/app/types/botNavigation.types";
import type { ThreadNavigationRow } from "@/components/app/types/thread-workspace/ports.types";

/** Bots mode: the workspace's bots, then global bots, each with its own threads. */
export function BotNavigation({ workspaceId, workspaceName, query, collapsed, onStart, onNavigate, onShowThreads, onNewGroup }: BotNavigationProps) {
  const ports = useThreadNavigationPorts();
  const now = useThreadTime();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const { personalization, sharedBots } = ports.state.boot;
  const bots = useMemo(() => effectiveBots(personalization.bots, workspaceId, sharedBots), [personalization.bots, workspaceId, sharedBots]);
  const { visibility: memberThreads } = useMemberThreadVisibility();
  const rows = useMemo(() => workspaceId ? applyMemberThreadVisibility(buildThreadNavigation(ports.state, workspaceId, "all"), memberThreads) : [],
    [ports.state, workspaceId, memberThreads]);
  const startWith = (id: string): void => onStart(id === NORA_ASSISTANT.id ? null : id);
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
  const [infoId, setInfoId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ botId: string; key: number } | null>(null);
  const editBot = (botId: string): void => setEditor((current) => ({ botId, key: (current?.key ?? 0) + 1 }));
  const editing = editor ? bots.find((entry) => entry.bot.id === editor.botId)?.bot ?? null : null;
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleting = deletingId ? bots.find((entry) => entry.bot.id === deletingId)?.bot ?? null : null;
  const providers = useMemo(() => new Map(ports.state.boot.providers.map((provider) => [provider.kind, provider.label])), [ports.state.boot.providers]);
  // Looked up without the search query, so filtering the list never closes an open panel.
  const info = useMemo(() => infoId ? buildBotInfo(buildBotNavigation(bots, rows, "", workspaceName).flatMap((group) => group.items).find((item) => item.id === infoId),
    bots, rows, providers) : null, [infoId, bots, rows, workspaceName, providers]);
  const workspace = ports.state.boot.workspaces.find((entry) => entry.id === workspaceId) ?? null;
  const toggle = (botId: string): void => setExpanded((current) => {
    const next = new Set(current);
    if (!next.delete(botId)) next.add(botId);
    return next;
  });
  if (collapsed) {
    return <nav aria-label="Bots" className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto py-1">
      {groups.flatMap((group) => group.items).map(({ id, name, avatar, state }) => <Button key={id} type="button" variant="ghost" size="icon" className="size-8"
        aria-label={`New thread with ${name}`} tooltip={name} onClick={() => startWith(id)}>
        {avatar ? <BotAvatar avatar={avatar} state={state} size={24} /> : <AppMark className="size-5 shrink-0" />}</Button>)}
    </nav>;
  }
  return <nav aria-label="Bots" className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-2">
    {groups.map((group) => <section key={group.id} aria-labelledby={group.label ? `bot-group-${group.id}` : undefined} aria-label={group.label ? undefined : "Nora"}>
      {group.label && <h3 id={`bot-group-${group.id}`} className="flex items-center gap-2 px-2 pb-1 pt-2 text-[11px] font-medium text-muted-foreground">
        <span className="min-w-0 flex-1 truncate">{group.label}</span><span className="text-[10px] tabular-nums">{group.items.length}</span></h3>}
      <ul className="space-y-0.5">{group.items.map((item) => <BotNavigationRow key={item.id} item={item} now={now} expanded={expanded.has(item.id)}
        onToggle={() => toggle(item.id)} onStart={() => startWith(item.id)} onOpen={open} onTogglePin={togglePin} onShowAllThreads={onShowThreads}
        onShowInfo={item.origin === "built-in" ? undefined : () => setInfoId(item.id)}
        onEdit={item.origin === "built-in" ? undefined : () => editBot(item.id)}
        onDelete={item.origin === "built-in" ? undefined : () => setDeletingId(item.id)} />)}</ul>
    </section>)}
    {(groupThreads.length > 0 || (onNewGroup && bots.length >= GROUP_MEMBERS_MIN && !query)) && <section aria-labelledby="bot-group-chats">
      <h3 id="bot-group-chats" className="flex items-center gap-2 px-2 pb-1 pt-2 text-[11px] font-medium text-muted-foreground">
        <span className="min-w-0 flex-1 truncate">Groups</span>
        {groupThreads.length > 0 && <MemberThreadsToggle compact />}
        {onNewGroup && <Button type="button" variant="ghost" size="icon" className="size-5 text-muted-foreground" aria-label="New group" tooltip="New group" onClick={onNewGroup}>
          <Plus className="size-3" aria-hidden="true" /></Button>}</h3>
      {groupThreads.length ? <div className="space-y-0.5">{groupThreads.map((row) => <ThreadRow key={row.id} row={row} now={now} workspace={null} request={null}
        onOpen={open} onTogglePin={togglePin} onSetSettled={setSettled} onRename={rename} />)}</div>
        : <p className="px-2 py-1 text-xs text-muted-foreground">Start a group to have several bots work on something together.</p>}
    </section>}
    {!groups.length && !groupThreads.length && <p role="status" className="px-2 py-4 text-xs text-muted-foreground">No matching bots.</p>}
    {!query && !bots.length && <p className="px-2 py-2 text-xs text-muted-foreground">Create a bot with New bot, or ask Nora to make one for you.</p>}
    {info && <BotInfoPanel info={info} workspace={workspace} workspaces={ports.state.boot.workspaces} now={now} onStart={() => startWith(info.item.id)}
      onOpen={open} onTogglePin={togglePin} onEdit={() => editBot(info.item.id)} onDelete={() => setDeletingId(info.item.id)} onClose={() => setInfoId(null)} />}
    {editor && editing && <BotEditorDialog key={editor.key} target={{ bot: editing }} workspace={workspace} defaultScope={editing.scope}
      takenIds={knownBotIds(personalization.bots, workspaceId, sharedBots)} onClose={() => setEditor(null)} />}
    {deleting && <DeleteBotDialog key={deleting.id} bot={deleting} onClose={() => setDeletingId(null)} />}
  </nav>;
}
