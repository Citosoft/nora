import { createContext, useMemo, useState } from "react";
import { knownBotIds } from "@shared/bots/catalog";
import { buildBotInfo } from "@/components/app/logic/botInfo";
import { buildBotNavigation, NORA_ASSISTANT } from "@/components/app/logic/botNavigation";
import { buildThreadNavigation } from "@/components/app/logic/thread-workspace/navigation";
import { useThreadCenterPorts } from "@/components/app/hooks/useThreadCenterPorts";
import { useThreadNavigationPorts } from "@/components/app/hooks/useThreadNavigationPorts";
import { useThreadTime } from "@/components/app/hooks/useThreadTime";
import { useWorkspaceBotRoster } from "@/components/app/hooks/useWorkspaceBotRoster";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { BotInfoPanel } from "@/components/app/panels/bots/BotInfoPanel";
import { DeleteBotDialog } from "@/components/app/panels/bots/DeleteBotDialog";
import { BotEditorDialog } from "@/components/app/panels/settings/bots/BotEditorDialog";
import type { BotInfoActions, BotInfoProviderProps } from "@/components/app/types/botNavigation.types";
import type { ThreadNavigationRow } from "@/components/app/types/thread-workspace/ports.types";

export const BotInfoContext = createContext<BotInfoActions | null>(null);

/**
 * Hosts the one bot info panel (with the editor and delete confirmation it opens) for the focused workspace, so the Bots sidebar, Bots home, chats and
 * threads all open the same panel.
 */
export function BotInfoProvider({ children }: BotInfoProviderProps) {
  const { state, store } = useThreadCenterPorts();
  const { openRow, togglePin } = useThreadNavigationPorts();
  const { closeTool } = useWorkspaceNavigation();
  const now = useThreadTime();
  const workspaceId = state.layout.focusedWorkspaceId;
  const workspace = state.boot.workspaces.find((entry) => entry.id === workspaceId) ?? null;
  const { bots, rows } = useWorkspaceBotRoster(state, workspace?.id ?? null);
  const [infoId, setInfoId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ botId: string; key: number } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const actions = useMemo<BotInfoActions>(() => ({
    show: setInfoId,
    edit: (botId) => setEditor((current) => ({ botId, key: (current?.key ?? 0) + 1 })),
    remove: setDeletingId
  }), []);
  const providers = useMemo(() => new Map(state.boot.providers.map((provider) => [provider.kind, provider.label])), [state.boot.providers]);
  const info = useMemo(() => infoId ? buildBotInfo(buildBotNavigation(bots, rows, "", workspace?.name ?? null).flatMap((group) => group.items).find((item) => item.id === infoId),
    bots, rows, providers) : null, [infoId, bots, rows, workspace, providers]);
  // Routine runs may land in work threads hidden from the list, so they are looked up among every row.
  const allRows = useMemo(() => workspace ? buildThreadNavigation(state, workspace.id, "all") : [], [state, workspace]);
  const open = (row: ThreadNavigationRow): void => { closeTool(); openRow(row); };
  const togglePinRow = (row: ThreadNavigationRow): void => { if (row.target.kind === "thread") togglePin(row.target.conversationId); };
  const openerFor = (conversationId: string): (() => void) | null => {
    const row = allRows.find((entry) => entry.target.kind === "thread" && entry.target.conversationId === conversationId);
    return row ? () => open(row) : null;
  };
  const start = (botId: string): void => {
    if (!workspace) return;
    closeTool();
    if (botId === NORA_ASSISTANT.id) store.openDraft({ workspaceId: workspace.id });
    else store.openDirect(workspace.id, botId);
  };
  const editing = editor ? bots.find((entry) => entry.bot.id === editor.botId)?.bot ?? null : null;
  const deleting = deletingId ? bots.find((entry) => entry.bot.id === deletingId)?.bot ?? null : null;
  return <BotInfoContext.Provider value={actions}>
    {children}
    {info && <BotInfoPanel info={info} workspace={workspace} workspaces={state.boot.workspaces} now={now} onStart={() => start(info.item.id)}
      onOpen={open} openerFor={openerFor} onTogglePin={togglePinRow} onEdit={() => actions.edit(info.item.id)} onDelete={() => setDeletingId(info.item.id)}
      onClose={() => setInfoId(null)} />}
    {editor && editing && <BotEditorDialog key={editor.key} target={{ bot: editing }} workspace={workspace} defaultScope={editing.scope}
      takenIds={knownBotIds(state.boot.personalization.bots, workspace?.id ?? null, state.boot.sharedBots)} onClose={() => setEditor(null)} />}
    {deleting && <DeleteBotDialog key={deleting.id} bot={deleting} onClose={() => setDeletingId(null)} />}
  </BotInfoContext.Provider>;
}
