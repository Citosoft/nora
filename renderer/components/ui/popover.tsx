import { cn } from "@/lib/utils";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React from "react";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, sideOffset = 8, align = "start", ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      align={align}
      className={cn(
        "z-[9999] w-[min(32rem,calc(100vw-2rem))] rounded-[11px] border border-border/70 bg-popover/95 p-3 text-sm text-popover-foreground shadow-2xl backdrop-blur data-[side=right]:animate-in data-[side=right]:slide-in-from-left-1 data-[side=left]:animate-in data-[side=left]:slide-in-from-right-1 data-[side=top]:animate-in data-[side=top]:slide-in-from-bottom-1 data-[side=bottom]:animate-in data-[side=bottom]:slide-in-from-top-1",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger };
