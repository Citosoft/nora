import type {
  OptionGroupLikeProps,
  OptionLikeProps,
  SelectOption,
  SelectOptionGroup,
  SelectOptionItemProps,
  SelectProps
} from "@/components/ui/types/primitives.types";
import { cn } from "@/lib/utils";
import { menuItemClass, menuLabelClass, menuSurfaceClass } from "@/components/ui/menu-styles";
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

export function flattenSelectOptions(children: React.ReactNode, groupLabel?: React.ReactNode): SelectOption[] {
  return React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement(child)) {
      return [];
    }

    if (child.type === React.Fragment) {
      return flattenSelectOptions((child.props as { children?: React.ReactNode }).children, groupLabel);
    }

    if (typeof child.type === "string" && child.type.toLowerCase() === "option") {
      const props = child.props as OptionLikeProps;
      return [{
        value: String(props.value ?? ""),
        label: props.children,
        disabled: props.disabled === true,
        groupLabel
      }];
    }

    if (typeof child.type === "string" && child.type.toLowerCase() === "optgroup") {
      const props = child.props as OptionGroupLikeProps;
      return flattenSelectOptions(props.children, props.label).map((option) => ({
        ...option,
        disabled: props.disabled === true || option.disabled
      }));
    }

    return [];
  });
}

function groupSelectOptions(options: SelectOption[]): SelectOptionGroup[] {
  const groups: SelectOptionGroup[] = [];
  for (const option of options) {
    const previous = groups.at(-1);
    if (previous && previous.label === option.groupLabel) {
      previous.options.push(option);
      continue;
    }
    groups.push({
      id: `group-${groups.length}`,
      label: option.groupLabel ?? null,
      options: [option]
    });
  }
  return groups;
}

function SelectOptionItem({ option }: SelectOptionItemProps) {
  return (
    <SelectPrimitive.Item
      value={option.value === "" ? EMPTY_OPTION_VALUE : option.value}
      disabled={option.disabled}
      className={cn(menuItemClass, "pl-8 pr-3")}
    >
      <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex items-center text-popover-foreground">
        <Check className="size-4" />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
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
  const [open, setOpen] = React.useState(false);
  const options = React.useMemo(() => flattenSelectOptions(children), [children]);
  const optionGroups = React.useMemo(() => groupSelectOptions(options), [options]);
  const fallbackValue = value ?? defaultValue ?? options.find((option) => !option.disabled)?.value ?? "";
  const selectedValue = String(fallbackValue);
  const selectedOption = options.find((option) => option.value === selectedValue) ?? null;
  const radixValue = selectedValue === "" ? EMPTY_OPTION_VALUE : selectedValue;

  return (
    <SelectPrimitive.Root
      open={open}
      onOpenChange={setOpen}
      value={radixValue}
      disabled={disabled}
      onValueChange={(nextValue) => {
        const normalizedValue = nextValue === EMPTY_OPTION_VALUE ? "" : nextValue;
        onChange?.({
          target: { value: normalizedValue },
          currentTarget: { value: normalizedValue }
        } as React.ChangeEvent<HTMLSelectElement>);
        setOpen(false);
      }}
    >
        <SelectPrimitive.Trigger
          className={cn(
            "form-control-surface flex h-10 w-full min-w-0 items-center justify-between overflow-hidden rounded-md border px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
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
          className={cn("z-[31000] min-w-[var(--radix-select-trigger-width)] max-h-[min(22rem,var(--radix-select-content-available-height))] overflow-hidden", menuSurfaceClass)}
        >
          <SelectPrimitive.ScrollUpButton className="grid place-items-center py-1 text-muted-foreground">
            <ChevronUp className="size-4" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="max-h-[inherit]">
            {optionGroups.map((group) => group.label === null ? group.options.map((option) => (
              <SelectOptionItem key={`${option.value}:${String(option.label)}`} option={option} />
            )) : (
              <SelectPrimitive.Group key={group.id}>
                <SelectPrimitive.Label className={menuLabelClass}>
                  {group.label}
                </SelectPrimitive.Label>
                {group.options.map((option) => (
                  <SelectOptionItem key={`${option.value}:${String(option.label)}`} option={option} />
                ))}
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
}
