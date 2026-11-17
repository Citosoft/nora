import { NORA_BOT_ID } from "@shared/bots/catalog";
import { useChangesColumnPorts } from "@/components/app/hooks/useChangesColumnPorts";
import { BotMemorySection } from "@/components/app/panels/settings/bots/BotMemorySection";

export function WorkspaceMemoryPanel() {
  const { memoryWorkspace } = useChangesColumnPorts();
  if (!memoryWorkspace) {
    return <p className="px-4 py-8 text-center text-xs text-muted-foreground">Choose a workspace to see Nora’s memories.</p>;
  }
  return <div className="flex min-h-0 flex-1 flex-col p-3">
    <BotMemorySection key={memoryWorkspace.id} botId={NORA_BOT_ID} botName="Nora"
      scope={{ kind: "workspace", workspace: memoryWorkspace }} disabled={false} />
  </div>;
}
