import { isAiChatReasoningLevel } from "@/components/app/types";
import type { AiChatReasoningLevelSelectProps } from "@/components/app/types/aiChatPanelSelects.types";
import { cn } from "@/lib/utils";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Brain, Check, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { AI_CHAT_PANEL_REASONING_LEVEL_MENU } from "@/components/app/logic/aiChatPanelConstants";

export const AiChatReasoningLevelSelect = ({
  value,
  supportedLevels,
  disabled,
  onChange
}: AiChatReasoningLevelSelectProps) => {
  const availableMenu = AI_CHAT_PANEL_REASONING_LEVEL_MENU.filter((entry) => supportedLevels.includes(entry.value));
  const active = availableMenu.find((entry) => entry.value === value) ?? availableMenu[0] ?? AI_CHAT_PANEL_REASONING_LEVEL_MENU[0];
  const disabledWithSingleOption = disabled || availableMenu.length <= 1;

  return (
    <SelectPrimitive.Root
      value={active.value}
      disabled={disabledWithSingleOption}
      onValueChange={(next) => {
        if (isAiChatReasoningLevel(next)) {
          onChange(next);
        }
      }}
    >
      <SelectPrimitive.Trigger
        aria-label="Reasoning level"
        title={active.description}
        className={cn(
          "inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-border/55 bg-background/85 px-2 text-[11px] font-medium text-foreground/90 shadow-sm backdrop-blur-sm transition-colors",
          "hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
          "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
        )}
      >
        {active.value === "off" ? (
          <Zap className="size-3 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <Brain className="size-3 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <span className="max-w-[4.5rem] truncate sm:max-w-[6rem]">{active.shortLabel}</span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          side="top"
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 max-h-[min(20rem,var(--radix-select-content-available-height))] w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-[10px] border border-border/70 bg-popover text-popover-foreground shadow-lg"
        >
          <SelectPrimitive.ScrollUpButton className="grid place-items-center py-1 text-muted-foreground">
            <ChevronUp className="size-4" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="max-h-[inherit] space-y-0.5 p-1">
            {availableMenu.map((entry) => (
              <SelectPrimitive.Item
                key={entry.value}
                value={entry.value}
                textValue={entry.label}
                className="relative flex cursor-default select-none flex-row items-start gap-2 rounded-[6px] py-2 pl-8 pr-2 text-[13px] outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2 top-2.5 flex items-center">
                  <Check className="size-3.5" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText asChild>
                  <div className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      {entry.value === "off" ? (
                        <Zap className="size-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <Brain className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span>{entry.label}</span>
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{entry.description}</span>
                  </div>
                </SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
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
