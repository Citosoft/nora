import { createRoot } from "react-dom/client";
import { Button } from "@/components/ui/button";
import { createConversationClient } from "@/components/app/clients/createConversationClient";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";
import { createThreadLayoutPersistence } from "@/components/app/logic/thread-workspace/persistence";
import { ThreadWorkspaceComposition } from "@/components/app/views/ThreadWorkspaceComposition";
import { ThreadNavigation } from "@/components/app/panels/threads/ThreadNavigation";
import { ThreadTabs } from "@/components/app/panels/threads/ThreadTabs";
import { ThreadWorkspaceCenter } from "@/components/app/panels/threads/ThreadWorkspaceCenter";
import type { ThreadWorkspaceStore } from "@/components/app/types/thread-workspace/state.types";
import { simulatorScenarios } from "../scenarios";
import type { SimulatorProps } from "../types/renderer.types";
import type {} from "../types/bridge.types";

export function Simulator({ store }: SimulatorProps) {
  return <ThreadWorkspaceComposition store={store}><main className="flex h-screen min-h-0 flex-col overflow-hidden bg-background text-foreground">
    <header className="flex shrink-0 items-center justify-between gap-4 border-b bg-amber-500/10 px-4 py-3 text-sm">
      <div><strong>Developer chat simulator</strong><span className="ml-3 text-muted-foreground">Local events · zero LLM tokens · no commands executed</span></div>
      <Button size="sm" variant="ghost" onClick={() => {
        const dark = !document.documentElement.classList.contains("dark");
        document.documentElement.classList.toggle("dark", dark); document.documentElement.dataset.theme = dark ? "dark" : "light";
        localStorage.setItem("nora-simulator-theme", dark ? "dark" : "light");
      }}>Toggle theme</Button>
    </header>
    <div className="flex min-h-0 flex-1 overflow-hidden"><aside className="flex min-h-0 w-60 shrink-0 flex-col overflow-hidden border-r p-3">
      <section aria-label="Simulator scenarios" className="flex max-h-[55%] min-h-0 shrink-0 flex-col">
      <p className="mb-2 shrink-0 px-2 text-xs font-medium text-muted-foreground">SCENARIOS</p>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain">{simulatorScenarios.map((scenario) => <Button key={scenario.id} data-scenario={scenario.id} variant="ghost"
        className="h-auto w-full flex-col items-start gap-1 whitespace-normal px-2 py-2 text-left" onClick={() => {
          store.openDraft({ workspaceId: "simulator", text: `/${scenario.id}` });
        }}><span className="text-sm font-medium">{scenario.label}</span><span className="text-xs font-normal text-muted-foreground">{scenario.description}</span></Button>)}</div>
      </section>
      <p className="mb-2 mt-4 shrink-0 px-2 text-xs font-medium text-muted-foreground">CONVERSATIONS</p><ThreadNavigation />
    </aside><section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"><ThreadTabs /><ThreadWorkspaceCenter /></section></div>
  </main></ThreadWorkspaceComposition>;
}

async function mount(): Promise<void> {
  const dark = localStorage.getItem("nora-simulator-theme") === "dark";
  document.documentElement.classList.toggle("dark", dark); document.documentElement.dataset.theme = dark ? "dark" : "light";
  const boot = await window.noraChatSimulator.boot();
  const store: ThreadWorkspaceStore = createThreadWorkspaceStore({ boot,
    client: createConversationClient(window.noraChatSimulator.conversations, boot.environmentId),
    persistence: createThreadLayoutPersistence(localStorage, boot.environmentId), nextId: () => crypto.randomUUID(), now: () => new Date().toISOString() });
  store.focusWorkspace("simulator");
  if (!store.snapshot().layout.activeId) store.openDraft({ workspaceId: "simulator", text: "/tour" });
  const root = document.getElementById("app"); if (!root) throw new Error("Simulator root is missing");
  createRoot(root).render(<Simulator store={store} />);
}
void mount().catch((cause: unknown) => { const root = document.getElementById("app"); if (root) root.textContent = cause instanceof Error ? cause.message : "The chat simulator could not start."; });
