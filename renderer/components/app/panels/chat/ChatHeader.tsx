import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { BotAvatarStack } from "@/components/app/shared/BotAvatarStack";
import { BotInfoTrigger } from "@/components/app/shared/BotInfoTrigger";
import { memberList } from "@/components/app/logic/botThreads";
import { CHAT_TAB } from "@/components/app/logic/chatTabs";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatTab } from "./ChatTab";
import { ChatDraftTab } from "./ChatDraftTab";
import { ChatNewBranchButton } from "./ChatNewBranchButton";
import type { ChatHeaderProps } from "@/components/app/types/chatPanels.types";

/** Who the chat is with, then a tab for the chat, one for each work thread or branch behind it, and + to branch off. */
export function ChatHeader({ participants, state, tabs, drafts, onNewBranch, onCloseDraft, onCloseThread }: ChatHeaderProps) {
  const group = participants.kind === "group" ? participants : null;
  const writer = group?.members.find((member) => member.botId === group.writer)?.name;
  const lead = group?.members.find((member) => member.botId === group.lead)?.name;
  const name = participants.kind === "direct" ? participants.bot.name : memberList(participants.members.map((member) => member.name));
  const subtitle = participants.kind === "direct" ? participants.bot.role
    : [writer ? `${writer} can change files` : "Members read only", lead ? `${lead} leads` : null].filter(Boolean).join(" · ");
  return <header className="flex min-w-0 items-center gap-3 border-b px-4 py-2">
    {participants.kind === "direct"
      ? <BotInfoTrigger botId={participants.bot.botId} name={participants.bot.name} className="flex min-w-0 max-w-[40%] shrink-0 items-center gap-2 pr-1">
        <BotAvatar avatar={participants.bot.avatar} state={state} size={28} /><h1 className="truncate text-sm font-semibold">{name}</h1></BotInfoTrigger>
      : <div className="flex min-w-0 max-w-[40%] shrink-0 items-center gap-2" title={subtitle || undefined}>
        <BotAvatarStack members={participants.members} size={22} label={`Group: ${name}`} /><h1 className="truncate text-sm font-semibold">{name}</h1></div>}
    <TabsList aria-label="Chat and work threads" className="flex min-w-0 flex-1 justify-start gap-1 overflow-x-auto border-0 bg-transparent p-0 [scrollbar-width:none]">
      <TabsTrigger value={CHAT_TAB} className="shrink-0 rounded-md px-2.5 py-1">Chat</TabsTrigger>
      {tabs.map((thread) => <ChatTab key={thread.id} thread={thread} onClose={() => onCloseThread(thread.id)} />)}
      {drafts.map((draft) => <ChatDraftTab key={draft.key} draft={draft} onClose={() => onCloseDraft(draft.key)}
        name={participants.kind === "direct" ? participants.bot.name : participants.members.find((member) => member.botId === draft.botId)?.name ?? "a member"} />)}
    </TabsList>
    {onNewBranch && <ChatNewBranchButton participants={participants} onNewBranch={onNewBranch} />}
  </header>;
}
