import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

const badgeVariants = cva(
  "inline-flex items-center rounded-[5px] border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/15 text-primary dark:border-primary/30 dark:bg-primary/20 dark:text-primary",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground dark:border-border/50 dark:bg-muted/70 dark:text-foreground",
        outline:
          "border-border bg-transparent text-foreground dark:border-border/70 dark:bg-muted/35 dark:text-foreground",
        success:
          "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-300/55 dark:bg-emerald-500/12 dark:text-emerald-100",
        warning: "border-amber-200 bg-amber-100 text-amber-800 dark:border-transparent dark:bg-amber-500/15 dark:text-amber-300",
        destructive: "border-rose-200 bg-rose-100 text-rose-800 dark:border-transparent dark:bg-rose-500/15 dark:text-rose-300"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
