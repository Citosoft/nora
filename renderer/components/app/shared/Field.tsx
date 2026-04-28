import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Field({
  label,
  children,
  className
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid gap-2 text-sm font-medium text-foreground", className)}>
      <span>{label}</span>
      {children}
    </label>
  );
}
