import type { AiChatPanelHeaderProps } from "@/components/app/types/aiChatPanelLayout.types";
import { AiProviderLogo } from "@/components/app/views/AiProviderLogo";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export const AiChatPanelHeader = ({
  provider,
  selectedProvider,
  selectedModel,
  onOpenAiSettings,
  isStreaming,
  onStop
}: AiChatPanelHeaderProps) => {
  return (
    <div className="flex items-center justify-between border-b border-border/60 px-4 py-2 text-xs text-muted-foreground">
      <div className="flex flex-row items-center gap-2">
        {provider ? (
          <AiProviderLogo provider={provider} className="size-4 shrink-0 [&_img]:size-3.5" />
        ) : (
          <Sparkles className="size-4 shrink-0 text-primary" />
        )}
        <span className="min-w-0">
          {provider ? (
            `${selectedProvider} · ${selectedModel}`
          ) : (
            <>
              Configure an AI API key in{" "}
              <button
                type="button"
                className="inline-flex items-center rounded-sm font-medium text-foreground underline decoration-foreground/50 underline-offset-2 transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
                onClick={onOpenAiSettings}
              >
                Settings
              </button>{" "}
              → AI
            </>
          )}
        </span>
      </div>
      {isStreaming ? (
        <Button variant="outline" size="sm" onClick={onStop}>
          Stop
        </Button>
      ) : null}
    </div>
  );
};
