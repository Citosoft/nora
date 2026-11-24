import { notifyBotsChanged } from "@/state/botSettingsChanges";
import { useEffect, useRef, useState } from "react";
import type { BotDefinition } from "@shared/types/bots/bots.types";
import type { SaveRemoteBot } from "@shared/types/remote-access/management.types";
import type { BotEditorState, BotSettingsData, BotSettingsProps } from "@/types/botSettings.types";
import { editBotDraft, findEditableBot, newBotDraft } from "@/state/botSettings";
import { Banner } from "@/components/common/Banner";
import { Inset } from "@/components/common/Inset";
import { createId } from "@/platform/randomId";
import { useSessionResource } from "@/hooks/useSessionResource";
import { ListRow } from "@/components/common/ListRow";
import { ListSection } from "@/components/common/ListSection";
import { StateView } from "@/components/common/StateView";
import { BotAvatar } from "@/components/common/BotAvatar";
import { BotEditor } from "./BotEditor";

export function BotSettings({ session, intent }: BotSettingsProps) {
  const { state, refresh } = useSessionResource<BotSettingsData>(session, async (client) => {
    const [bots, projects] = await Promise.all([client.botSettings(), client.projects()]);
    return { bots, projects };
  }, { key: "bot-settings", isAffectedBy: () => false });
  const [editor, setEditor] = useState<BotEditorState>({ kind: "closed" });
  const value = state.status === "ready" ? state.value : state.status === "error" ? state.stale : null;
  const handledIntent = useRef(false);
  const [intentError, setIntentError] = useState<string | null>(null);
  const edit = (bot: BotDefinition): void => setEditor({ kind: "open", draft: editBotDraft(bot) });
  const create = (): void => setEditor({ kind: "open", draft: newBotDraft(createId(), Math.floor(Math.random() * 2_147_483_647)) });
  useEffect(() => {
    if (!value || !intent || intent.kind === "list" || handledIntent.current) return;
    handledIntent.current = true;
    if (intent.kind === "create") {
      if (intent.workspaceId && !value.projects.some((project) => project.id === intent.workspaceId)) {
        setIntentError("This workspace is no longer available. Choose a workspace when creating your bot.");
        return;
      }
      setEditor({ kind: "open", draft: newBotDraft(createId(), Math.floor(Math.random() * 2_147_483_647), intent.workspaceId) });
      return;
    }
    const bot = findEditableBot(value.bots, intent.botId, intent.scope);
    if (bot) setEditor({ kind: "open", draft: editBotDraft(bot) });
    else setIntentError("This bot is no longer available. Refresh the bot list and try again.");
  }, [intent, value]);
  const save = async (input: SaveRemoteBot): Promise<void> => { await session.client.saveBot(input); notifyBotsChanged(session.runtimeId); refresh(); };
  return <>
    {intentError ? <Inset><Banner tone="attention" title="Couldn’t open bot" message={intentError} /></Inset> : null}
    {state.status === "loading" ? <StateView kind="loading" message="Loading bots…" /> : null}
    {state.status === "error" ? <StateView kind="error" title="Couldn’t load bots" message={state.message} onRetry={refresh} /> : null}
    {value ? <ListSection header="Bots" footer="Edits apply to new work threads. Existing threads keep their original instructions and model.">
      {value.bots.map((bot) => <ListRow key={`${JSON.stringify(bot.scope)}:${bot.id}`} title={bot.name} subtitle={bot.role}
        value={bot.scope.kind === "global" ? "Every workspace" : value.projects.find((project) => bot.scope.kind === "workspace" && project.id === bot.scope.workspaceId)?.name ?? "Workspace"}
        leading={<BotAvatar avatar={bot.avatar} name={bot.name} />} accessory="chevron" onPress={() => edit(bot)} />)}
      {!value.bots.length ? <ListRow title="No bots yet" subtitle="Create a bot with its own role and instructions." /> : null}
      <ListRow title="Create bot" centered onPress={create} />
      <ListRow title="Refresh bots" centered onPress={refresh} />
    </ListSection> : null}
    {editor.kind === "open" && value ? <BotEditor key={`${editor.draft.id}:${editor.draft.revision}`} initial={editor.draft} projects={value.projects}
      onSave={save} onClose={() => setEditor({ kind: "closed" })} /> : null}
  </>;
}
