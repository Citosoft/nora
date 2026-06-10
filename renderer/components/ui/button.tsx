import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[5px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "button-outline-surface border text-[12.5px] font-semibold text-foreground shadow-none",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
        outline: "button-outline-surface border text-[12.5px] text-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        invisible: "border-transparent bg-transparent text-foreground shadow-none hover:border-transparent hover:bg-transparent"
      },
      size: {
        default: "h-9 px-3.5 py-2",
        sm: "h-8 rounded-[5px] px-3",
        lg: "h-10 rounded-[5px] px-6",
        icon: "size-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  tooltip?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, tooltip, ...props }, ref) => {
    const inferredTooltip =
      tooltip ??
      (size === "icon" && typeof props["aria-label"] === "string" ? props["aria-label"] : undefined);
    const title = inferredTooltip ? undefined : props.title;

    const button = (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        title={title}
        {...props}
      />
    );

    return inferredTooltip ? <Tooltip content={inferredTooltip}>{button}</Tooltip> : button;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
