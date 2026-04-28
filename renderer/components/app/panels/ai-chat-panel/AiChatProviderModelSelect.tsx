import { DEFAULT_AI_CHAT_MODEL_BY_PROVIDER, resolveAiChatProvider } from "@/components/app/logic/aiChatModel";
import {
  decodeChatModelChoice,
  encodeChatModelChoice,
  formatAiModelReleasedLabel,
  listModelsForAiChatSelector
} from "@/components/app/logic/aiChatSelection";
import type { AiChatProviderModelSelectProps } from "@/components/app/types/aiChatPanelSelects.types";
import { AiProviderLogo } from "@/components/app/views/AiProviderLogo";
import { cn } from "@/lib/utils";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { useMemo } from "react";
import { AI_CHAT_PANEL_PROVIDER_LABELS, AI_CHAT_PANEL_PROVIDERS } from "@/components/app/logic/aiChatPanelConstants";

export const AiChatProviderModelSelect = ({
  aiSettings,
  aiModelOptions,
  aiModelLoading,
  disabled,
  onSelect
}: AiChatProviderModelSelectProps) => {
  const resolved = resolveAiChatProvider(aiSettings);
  const grouped = useMemo(() => {
    return AI_CHAT_PANEL_PROVIDERS.map((provider) => {
      const apiKey = aiSettings.apiKeys[provider];
      const fallback = DEFAULT_AI_CHAT_MODEL_BY_PROVIDER[provider];
      const saved = aiSettings.modelByProvider[provider] ?? "";
      const models = listModelsForAiChatSelector(provider, apiKey, aiModelOptions[provider] ?? [], saved, fallback);
      return { provider, label: AI_CHAT_PANEL_PROVIDER_LABELS[provider], models };
    }).filter((entry) => entry.models.length > 0);
  }, [aiModelOptions, aiSettings.apiKeys, aiSettings.modelByProvider]);

  const selectedValue = useMemo(() => {
    if (!resolved) {
      return "";
    }
    const model =
      aiSettings.modelByProvider[resolved]?.trim() || DEFAULT_AI_CHAT_MODEL_BY_PROVIDER[resolved];
    return encodeChatModelChoice(resolved, model);
  }, [aiSettings.modelByProvider, resolved]);

  const triggerLabel = useMemo(() => {
    if (!resolved) {
      return "Model";
    }
    const model =
      aiSettings.modelByProvider[resolved]?.trim() || DEFAULT_AI_CHAT_MODEL_BY_PROVIDER[resolved];
    const released = aiModelOptions[resolved]?.find((entry) => entry.id === model)?.releasedAtMs;
    const dateSuffix = formatAiModelReleasedLabel(released);
    return dateSuffix
      ? `${AI_CHAT_PANEL_PROVIDER_LABELS[resolved]} · ${model} · ${dateSuffix}`
      : `${AI_CHAT_PANEL_PROVIDER_LABELS[resolved]} · ${model}`;
  }, [aiModelOptions, aiSettings.modelByProvider, resolved]);

  if (!resolved || grouped.length === 0) {
    return null;
  }

  const showLoadingHint = aiModelLoading[resolved] && (aiModelOptions[resolved]?.length ?? 0) === 0;

  return (
    <SelectPrimitive.Root
      value={selectedValue}
      disabled={disabled}
      onValueChange={(value) => {
        const decoded = decodeChatModelChoice(value);
        if (!decoded) {
          return;
        }
        onSelect(decoded.provider, decoded.model);
      }}
    >
      <SelectPrimitive.Trigger
        aria-label="Provider and model"
        className={cn(
          "flex h-8 w-full max-w-full items-center justify-between gap-2 rounded-[10px] border border-transparent bg-background/40 px-2.5 text-left text-xs font-medium text-foreground/90 transition-colors",
          "hover:bg-background/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
          "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
        )}
      >
        <span className="flex min-w-0 flex-1 flex-row items-center gap-2">
          {resolved && !showLoadingHint ? <AiProviderLogo provider={resolved} className="size-3.5 shrink-0 [&_img]:size-3" /> : null}
          <span className="min-w-0 flex-1 truncate">{showLoadingHint ? "Loading models…" : triggerLabel}</span>
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          side="top"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 max-h-[min(22rem,var(--radix-select-content-available-height))] w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-[10px] border border-border/70 bg-popover text-popover-foreground shadow-lg"
        >
          <SelectPrimitive.ScrollUpButton className="grid place-items-center py-1 text-muted-foreground">
            <ChevronUp className="size-4" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="max-h-[inherit] space-y-0.5 p-1">
            {grouped.map((group) => (
              <SelectPrimitive.Group key={group.provider}>
                <SelectPrimitive.Label className="inline-flex w-full flex-row items-center gap-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  <AiProviderLogo provider={group.provider} className="size-3.5 shrink-0 [&_img]:size-2.5" />
                  <span className="truncate">{group.label}</span>
                </SelectPrimitive.Label>
                {group.models.map((catalog) => {
                  const value = encodeChatModelChoice(group.provider, catalog.id);
                  const dateLabel = formatAiModelReleasedLabel(catalog.releasedAtMs);
                  return (
                    <SelectPrimitive.Item
                      key={value}
                      value={value}
                      className="relative flex cursor-default select-none flex-row items-start gap-2 rounded-[6px] py-2 pl-8 pr-2 text-[13px] outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                    >
                      <SelectPrimitive.ItemIndicator className="absolute left-2 top-2.5 flex items-center">
                        <Check className="size-3.5" />
                      </SelectPrimitive.ItemIndicator>
                      <AiProviderLogo provider={group.provider} className="mt-0.5 size-3.5 shrink-0 [&_img]:size-3" />
                      <SelectPrimitive.ItemText asChild>
                        <div className="min-w-0 flex-1">
                          <span className="block truncate">{catalog.id}</span>
                          {dateLabel ? (
                            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{dateLabel}</span>
                          ) : null}
                        </div>
                      </SelectPrimitive.ItemText>
                    </SelectPrimitive.Item>
                  );
                })}
              </SelectPrimitive.Group>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="grid place-items-center py-1 text-muted-foreground">
            <ChevronDown className="size-4" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
};
