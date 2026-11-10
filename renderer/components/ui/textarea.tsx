import { cn } from "@/lib/utils";
import * as React from "react";
import type { TextareaProps } from "@/lib/types/textarea.types";

export type { TextareaProps } from "@/lib/types/textarea.types";

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, variant = "default", ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-[5px] px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        variant === "embedded"
          ? "border-0 bg-transparent shadow-none"
          : "form-control-surface border ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
