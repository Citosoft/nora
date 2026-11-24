import type { FilePathLabelProps } from "@/components/app/types/diffLine.types";
import { cn } from "@/lib/utils";

/** A file path with its folders muted so the file name stands out; truncates from the end. */
export function FilePathLabel({ path, className }: FilePathLabelProps) {
  const separator = path.lastIndexOf("/");
  return <span className={cn("min-w-0 truncate", className)} title={path}>
    <span className="text-muted-foreground">{path.slice(0, separator + 1)}</span><span>{path.slice(separator + 1)}</span>
  </span>;
}
