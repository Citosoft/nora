import { useState } from "react";
import { Plus, Bot, Users } from "lucide-react";
import { GROUP_MEMBERS_MIN } from "@shared/bots/contracts";
import { useBotsHome } from "@/components/app/hooks/useBotsHome";
import { useThreadTime } from "@/components/app/hooks/useThreadTime";
import { Button } from "@/components/ui/button";
import { BotEditorDialog } from "@/components/app/panels/settings/bots/BotEditorDialog";
import { ThreadRow } from "@/components/app/panels/threads/ThreadRow";
import { BotHomeCard } from "./BotHomeCard";
import { BotTemplateSection } from "./BotTemplateSection";
import { BotsIntro } from "./BotsIntro";
import { NewGroupDialog } from "./NewGroupDialog";
import type { BotDefinition, BotTemplate } from "@shared/types/bots/bots.types";

type Editor = { key: number; bot: BotDefinition | null; template: BotTemplate | null };

/** The center view in Bots mode when no thread is open: your bots, groups, and templates; an introduction when there are no bots yet. */
export function BotsHome() {
  const home = useBotsHome();
  const now = useThreadTime();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [groupDialog, setGroupDialog] = useState(false);
  const open = (bot: BotDefinition | null, template: BotTemplate | null): void => setEditor((current) => ({ key: (current?.key ?? 0) + 1, bot, template }));
  const hasBots = home.bots.length > 0;
  const canGroup = !!home.workspace && home.bots.length >= GROUP_MEMBERS_MIN;
  return <section aria-label="Bots home" className="min-h-0 flex-1 overflow-y-auto">
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-9 px-6 py-10 sm:px-10 sm:py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground"><Bot className="size-4" aria-hidden="true" /><span>Bots{home.workspace ? ` · ${home.workspace.name}` : ""}</span></div>
          <h1 className="text-3xl font-semibold tracking-tight">Your bots</h1></div>
        {hasBots && <div className="flex gap-2">
          {canGroup && <Button type="button" variant="outline" className="gap-1.5" onClick={() => setGroupDialog(true)}><Users className="size-4" aria-hidden="true" />New group</Button>}
          <Button type="button" className="gap-1.5" onClick={() => open(null, null)}><Plus className="size-4" aria-hidden="true" />New bot</Button></div>}
      </header>
      {!hasBots && <BotsIntro onNewBot={() => open(null, null)} faces={[...home.templates.suggested, ...home.templates.more]} />}
      <section aria-labelledby="bots-home-bots">
        <h2 id="bots-home-bots" className="sr-only">Bots</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{home.items.map((item) => {
          const bot = home.bots.find((entry) => entry.bot.id === item.id)?.bot ?? null;
          const latest = item.threads[0];
          return <BotHomeCard key={item.id} item={item} onStart={() => home.startThread(bot ? bot.id : null)}
            onContinue={latest ? () => home.openThread(latest) : null} onEdit={bot ? () => open(bot, null) : null} />;
        })}</ul>
      </section>
      {(home.groupThreads.length > 0 || canGroup) && <section aria-labelledby="bots-home-groups" className="space-y-3">
        <div className="flex items-center justify-between gap-3"><h2 id="bots-home-groups" className="text-sm font-medium">Groups</h2>
          {canGroup && <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={() => setGroupDialog(true)}><Plus className="size-3.5" aria-hidden="true" />New group</Button>}</div>
        {home.groupThreads.length ? <div className="divide-y rounded-md border">{home.groupThreads.map((row) => <ThreadRow key={row.id} row={row} now={now} workspace={null} request={null}
          onOpen={home.openThread} onTogglePin={home.togglePin} />)}</div>
          : <p className="text-sm text-muted-foreground">Put {GROUP_MEMBERS_MIN} or more bots in a group to work on something together. @mention who should answer.</p>}
      </section>}
      {home.templateRole ? <>
        <BotTemplateSection id="bots-home-suggested" title={`Suggested for ${home.templateRole}`} templates={home.templates.suggested} onUse={(template) => open(null, template)}
          description="Templates open the editor prefilled, so you can pick the model and adjust the instructions before saving." />
        <BotTemplateSection id="bots-home-more" title="More templates" templates={home.templates.more} onUse={(template) => open(null, template)} />
      </> : <BotTemplateSection id="bots-home-templates" title="Start from a template" templates={home.templates.more} onUse={(template) => open(null, template)}
        description="Templates open the editor prefilled, so you can pick the model and adjust the instructions before saving." />}
    </div>
    {editor && <BotEditorDialog key={editor.key} target={editor.bot ? { bot: editor.bot } : null} template={editor.template} workspace={home.workspace}
      defaultScope={editor.bot?.scope ?? { kind: "global" }} takenIds={home.takenIds} onClose={() => setEditor(null)} />}
    {groupDialog && <NewGroupDialog bots={home.bots} workspaceName={home.workspace?.name ?? null} onClose={() => setGroupDialog(false)}
      onCreate={(group) => { setGroupDialog(false); home.startGroup(group); }} />}
  </section>;
}
