import { useMemo, useState } from "react";
import { Plus, RefreshCw, Bot } from "lucide-react";
import { effectiveBots, knownBotIds, workspaceBotSettings } from "@shared/bots/catalog";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { useThreadCenterPorts } from "@/components/app/hooks/useThreadCenterPorts";
import { Button } from "@/components/ui/button";
import { SettingsSectionHeader } from "./settingsUi";
import { BotList } from "./bots/BotList";
import { BotEditorDialog } from "./bots/BotEditorDialog";
import { MemorySettings } from "./bots/MemorySettings";
import type { BotDefinition, BotScope } from "@shared/types/bots/bots.types";
import type { BotEditorTarget } from "@/components/app/types/botEditor.types";

/** Global bots, plus the focused workspace's own bots and per-workspace visibility of inherited ones. */
export function BotsSettingsSection() {
  const { boot, request } = useNativeRuntimePorts();
  const { state } = useThreadCenterPorts();
  const workspace = boot.workspaces.find((entry) => entry.id === state.layout.focusedWorkspaceId) ?? null;
  const [editor, setEditor] = useState<{ key: number; target: BotEditorTarget | null; scope: BotScope } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const settings = boot.personalization.bots;
  const global = useMemo(() => effectiveBots(settings, null, []), [settings]);
  const shared = boot.sharedBots.find((entry) => entry.workspaceId === workspace?.id);
  const local = useMemo(() => workspace ? [...(shared?.bots ?? []).map((bot) => ({ bot, origin: "shared" as const, overrides: [] })),
    ...workspaceBotSettings(settings, workspace.id).private.map((bot) => ({ bot, origin: "private" as const, overrides: [] }))]
    .sort((a, b) => a.bot.name.localeCompare(b.bot.name)) : [], [settings, shared, workspace]);
  const hiddenIds = useMemo(() => new Set(workspace ? workspaceBotSettings(settings, workspace.id).hidden : []), [settings, workspace]);
  const takenIds = useMemo(() => knownBotIds(settings, workspace?.id ?? null, boot.sharedBots), [settings, workspace, boot.sharedBots]);
  const open = (target: BotEditorTarget | null, scope: BotScope): void => setEditor((current) => ({ key: (current?.key ?? 0) + 1, target, scope }));
  const run = async (action: () => Promise<unknown>): Promise<void> => {
    setBusy(true); setError(null);
    try { await action(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Bots could not be updated. Try again."); } finally { setBusy(false); }
  };
  const edit = (bot: BotDefinition): void => open({ bot }, bot.scope);
  return <div className="max-w-4xl space-y-8">
    <SettingsSectionHeader title="Bots" icon={Bot} description="Bots are teammates with their own role, instructions and model. Message one from the Bots sidebar, or ask Nora, your built-in app assistant, to create one for you." />
    <section aria-labelledby="bots-global" className="space-y-3">
      <div className="flex items-center justify-between gap-3"><div>
        <h2 id="bots-global" className="text-sm font-medium">Your bots</h2>
        <p className="text-sm text-muted-foreground">Available in every workspace on this computer.</p></div>
        <Button type="button" variant="outline" size="sm" onClick={() => open(null, { kind: "global" })}><Plus className="size-3.5" aria-hidden="true" />New bot</Button></div>
      <BotList bots={global} emptyText="You haven't created any bots yet." onEdit={edit}
        hide={workspace ? { hiddenIds, onToggle: (botId, hidden) => void run(() => request({ kind: "set-bot-hidden", workspaceId: workspace.id, botId, hidden })) } : undefined} />
    </section>
    {workspace && <section aria-labelledby="bots-workspace" className="space-y-3">
      <div className="flex items-center justify-between gap-3"><div>
        <h2 id="bots-workspace" className="text-sm font-medium">Bots in {workspace.name}</h2>
        <p className="text-sm text-muted-foreground">Shared bots are files in the workspace's <code>.nora/bots</code> folder. Private bots stay on this computer.</p></div>
        <div className="flex shrink-0 gap-1">
          <Button type="button" variant="ghost" size="icon" disabled={busy} aria-label="Reload shared bot files" tooltip="Reload shared bot files"
            onClick={() => void run(() => request({ kind: "refresh-bots" }))}><RefreshCw className="size-3.5" aria-hidden="true" /></Button>
          <Button type="button" variant="outline" size="sm" onClick={() => open(null, { kind: "workspace", workspaceId: workspace.id, storage: "private" })}>
            <Plus className="size-3.5" aria-hidden="true" />New bot</Button></div></div>
      <BotList bots={local} emptyText="This workspace has no bots of its own." onEdit={edit} />
      {shared?.problems.map((problem) => <p key={problem.file} role="alert" className="text-xs text-destructive"><code>{problem.file}</code>: {problem.message}</p>)}
    </section>}
    <MemorySettings />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {editor && <BotEditorDialog key={editor.key} target={editor.target} workspace={workspace} defaultScope={editor.scope}
      takenIds={takenIds} onClose={() => setEditor(null)} />}
  </div>;
}
