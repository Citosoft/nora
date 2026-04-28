import { cn } from "@/lib/utils";
import { forwardRef, type HTMLAttributes } from "react";

export const ScrollArea = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("overflow-auto", className)} {...props} />
);

ScrollArea.displayName = "ScrollArea";
