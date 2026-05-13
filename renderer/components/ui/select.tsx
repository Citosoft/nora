import type { OptionLikeProps, SelectOption, SelectProps } from "@/components/ui/types/primitives.types";
import { cn } from "@/lib/utils";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import * as React from "react";

const EMPTY_OPTION_VALUE = "__nora_select_empty__";

function renderSelectTriggerLabel(label: React.ReactNode): React.ReactNode {
  if (label === null || label === undefined || label === "") {
    return null;
  }

  if (typeof label === "string" || typeof label === "number") {
    return <span className="block min-w-0 truncate">{label}</span>;
  }

  return <span className="flex min-w-0 items-center gap-2 overflow-hidden">{label}</span>;
}

function flattenOptions(children: React.ReactNode): SelectOption[] {
  return React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement(child)) {
      return [];
    }

    if (child.type === React.Fragment) {
      return flattenOptions((child.props as { children?: React.ReactNode }).children);
    }

    if (typeof child.type === "string" && child.type.toLowerCase() === "option") {
      const props = child.props as OptionLikeProps;
      return [{
        value: String(props.value ?? ""),
        label: props.children,
        disabled: props.disabled === true
      }];
    }

    return [];
  });
}

export function Select({
  className,
  children,
  value,
  defaultValue,
  onChange,
  disabled,
  ...props
}: SelectProps) {
  const options = React.useMemo(() => flattenOptions(children), [children]);
  const fallbackValue = value ?? defaultValue ?? options.find((option) => !option.disabled)?.value ?? "";
  const selectedValue = String(fallbackValue);
  const selectedOption = options.find((option) => option.value === selectedValue) ?? null;
  const radixValue = selectedValue === "" ? EMPTY_OPTION_VALUE : selectedValue;

  return (
    <SelectPrimitive.Root
      value={radixValue}
      disabled={disabled}
      onValueChange={(nextValue) => {
        const normalizedValue = nextValue === EMPTY_OPTION_VALUE ? "" : nextValue;
        onChange?.({
          target: { value: normalizedValue },
          currentTarget: { value: normalizedValue }
        } as React.ChangeEvent<HTMLSelectElement>);
      }}
    >
        <SelectPrimitive.Trigger
          className={cn(
            "flex h-10 w-full min-w-0 items-center justify-between overflow-hidden rounded-[5px] border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        aria-label={props["aria-label"]}
        name={props.name}
      >
        <SelectPrimitive.Value className="min-w-0 flex-1 text-left">
          {renderSelectTriggerLabel(selectedOption?.label ?? "")}
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          side="bottom"
          sideOffset={6}
          avoidCollisions
          collisionPadding={8}
          className="z-[31000] min-w-[var(--radix-select-trigger-width)] max-h-[min(22rem,var(--radix-select-content-available-height))] overflow-hidden rounded-[7px] border border-border/70 bg-popover text-popover-foreground shadow-lg"
        >
          <SelectPrimitive.ScrollUpButton className="grid place-items-center py-1 text-muted-foreground">
            <ChevronUp className="size-4" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="max-h-[inherit] p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={`${option.value}:${String(option.label)}`}
                value={option.value === "" ? EMPTY_OPTION_VALUE : option.value}
                disabled={option.disabled}
                className="relative flex cursor-default select-none items-center rounded-[5px] py-2 pl-8 pr-3 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex items-center">
                  <Check className="size-4" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
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
}
