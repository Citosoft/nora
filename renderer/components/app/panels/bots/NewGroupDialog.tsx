import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { GROUP_MEMBERS_MAX, GROUP_MEMBERS_MIN } from "@shared/bots/contracts";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { NewGroupDialogProps } from "@/components/app/types/botNavigation.types";

/** Picks 2–6 bots from this workspace and, optionally, the one member allowed to change files and the one who leads. */
export function NewGroupDialog({ bots, workspaceName, onCreate, onClose }: NewGroupDialogProps) {
  const [chosen, setChosen] = useState<readonly string[]>([]);
  const [writer, setWriter] = useState("");
  const [lead, setLead] = useState("");
  const full = chosen.length >= GROUP_MEMBERS_MAX;
  const toggle = (botId: string): void => setChosen((current) => current.includes(botId) ? current.filter((id) => id !== botId) : [...current, botId]);
  const members = bots.filter((entry) => chosen.includes(entry.bot.id));
  const member = (botId: string): string | null => members.some((entry) => entry.bot.id === botId) ? botId : null;
  return <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/70 backdrop-blur-sm" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[30001] flex max-h-[calc(100dvh-3rem)] w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border bg-card shadow-panel outline-none">
        <div className="flex items-center justify-between gap-3 px-6 pb-2 pt-5">
          <Dialog.Title className="text-lg font-semibold">New group</Dialog.Title>
          <Dialog.Close asChild><Button type="button" variant="ghost" size="icon" aria-label="Close"><X className="size-4" aria-hidden="true" /></Button></Dialog.Close>
        </div>
        <Dialog.Description className="px-6 text-sm text-muted-foreground">
          Choose {GROUP_MEMBERS_MIN}–{GROUP_MEMBERS_MAX} bots{workspaceName ? ` from ${workspaceName}` : ""}. @mention members (or @everyone) to choose who replies; otherwise Nora picks. Each member answers in its own thread.
        </Dialog.Description>
        <fieldset className="min-h-0 flex-1 space-y-1 overflow-y-auto px-6 py-4"><legend className="sr-only">Members</legend>
          {bots.map(({ bot }) => { const checked = chosen.includes(bot.id);
            return <label key={bot.id} className={`flex items-center gap-3 rounded-md px-2 py-1.5 ${checked ? "bg-secondary" : "hover:bg-muted"}`}>
              <input type="checkbox" checked={checked} disabled={!checked && full} onChange={() => toggle(bot.id)} />
              <BotAvatar avatar={bot.avatar} size={28} />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm">{bot.name}</span>
                {bot.role && <span className="block truncate text-xs text-muted-foreground">{bot.role}</span>}</span>
            </label>; })}
          {bots.length < GROUP_MEMBERS_MIN && <p className="text-sm text-muted-foreground">Create at least {GROUP_MEMBERS_MIN} bots to start a group.</p>}
        </fieldset>
        <div className="grid grid-cols-2 gap-3 px-6 pb-4 text-sm">
          <div className="space-y-1.5"><label htmlFor="group-writer" className="font-medium">Can change files</label>
            <Select id="group-writer" value={member(writer) ?? ""} onChange={(event) => setWriter(event.target.value)}>
              <option value="">Nobody (read only)</option>{members.map(({ bot }) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
            </Select>
            <p className="text-xs text-muted-foreground">Other members can read the workspace but not change it.</p></div>
          <div className="space-y-1.5"><label htmlFor="group-lead" className="font-medium">Leads the group</label>
            <Select id="group-lead" value={member(lead) ?? ""} onChange={(event) => setLead(event.target.value)}>
              <option value="">Nobody</option>{members.map(({ bot }) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
            </Select>
            <p className="text-xs text-muted-foreground">Answers messages Nora can't match to a member.</p></div>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 border-t bg-muted/45 px-6 py-4">
          <Dialog.Close asChild><Button type="button" variant="ghost">Cancel</Button></Dialog.Close>
          <Button type="button" disabled={chosen.length < GROUP_MEMBERS_MIN}
            onClick={() => onCreate({ botIds: [...chosen], writer: member(writer), lead: member(lead) })}>Start group</Button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
