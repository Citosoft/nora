import { useState } from "react";
import { Braces, ListTodo, Plug } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChatContextInspector } from "@/components/app/hooks/useChatContextInspector";
import { ChatWorkPanel } from "./ChatWorkPanel";
import { ChatConnectorsPanel } from "./ChatConnectorsPanel";
import { ChatContextPanel } from "./ChatContextPanel";
import { ChatThreadDetail } from "./ChatThreadDetail";
import { ChatSidebarHeader } from "./ChatSidebarHeader";
import type { ChatSidebarProps, ChatSidebarTab } from "@/components/app/types/chatPanels.types";

const TABS: Record<ChatSidebarTab, { label: string; icon: LucideIcon }> = {
  work: { label: "Work", icon: ListTodo }, connectors: { label: "Connectors", icon: Plug }, context: { label: "Context", icon: Braces }
};
const PANE = "flex min-h-0 flex-1 flex-col";
const TAB = "-mb-px gap-1.5 rounded-none border-b-2 border-transparent px-0.5 pb-2 pt-1 hover:text-foreground data-[state=active]:border-foreground data-[state=active]:bg-transparent";

/**
 * The chat's right sidebar: in a direct chat the bot's header, then Work always, Connectors in a direct chat, and Context where the developer
 * preview is available. The tab strip shows only when there is more than one tab. A thread opened from Work shows its detail inside that tab until Back.
 */
export function ChatSidebar({ bot, work, threads, connectors, context }: ChatSidebarProps) {
  const [chosen, setChosen] = useState<ChatSidebarTab>("work");
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const inspector = useChatContextInspector({ ...context, active: chosen === "context" });
  const tabs: ChatSidebarTab[] = ["work", ...(connectors ? ["connectors" as const] : []), ...(inspector.available ? ["context" as const] : [])];
  // A tab that stops applying (the chat switched, say) falls back to Work.
  const tab = tabs.includes(chosen) ? chosen : "work";
  // A thread the chat no longer lists has no detail here, so it opens in full instead.
  const detail = openThreadId ? threads.resolve(openThreadId) : null;
  const openThread = (threadId: string): void => { if (threads.resolve(threadId)) setOpenThreadId(threadId); else threads.onOpenFull(threadId); };
  return <Tabs value={tab} onValueChange={(value) => setChosen(tabs.find((entry) => entry === value) ?? "work")} asChild>
    <aside aria-label="Chat sidebar" className="flex w-[400px] shrink-0 flex-col border-l">
      <div className="shrink-0 border-b">
        {bot && <ChatSidebarHeader {...bot} />}
        {tabs.length > 1 && <TabsList aria-label="Sidebar view" className={`flex justify-start gap-4 rounded-none border-0 bg-transparent px-4 py-0 ${bot ? "" : "pt-2"}`}>
          {tabs.map((entry) => {
            const { label, icon: Icon } = TABS[entry];
            return <TabsTrigger key={entry} value={entry} className={TAB}><Icon className="size-3.5" aria-hidden="true" />{label}</TabsTrigger>;
          })}
        </TabsList>}
      </div>
      <TabsContent value="work" className={PANE}>
        {detail ? <ChatThreadDetail key={detail.thread.id} {...detail} botInHeader={!!bot} chatId={threads.chatId} onBack={() => setOpenThreadId(null)} onOpenFull={threads.onOpenFull} />
          : <ChatWorkPanel {...work} onOpenThread={openThread} />}
      </TabsContent>
      {connectors && <TabsContent value="connectors" className={PANE}><ChatConnectorsPanel subject={connectors} /></TabsContent>}
      {inspector.available && <TabsContent value="context" className={PANE}>
        <ChatContextPanel state={inspector.state} target={inspector.target} onTargetChange={inspector.setTarget} onRefresh={inspector.refresh} /></TabsContent>}
    </aside>
  </Tabs>;
}
