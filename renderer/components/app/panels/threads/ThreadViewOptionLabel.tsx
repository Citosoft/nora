import type { ThreadViewOptionLabelProps } from "@/components/app/types/thread-workspace/toolbar.types";

export function ThreadViewOptionLabel({ icon, label }: ThreadViewOptionLabelProps) {
  return <span className="inline-flex min-w-0 items-center gap-2">
    <span aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center">{icon}</span>
    <span className="truncate">{label}</span>
  </span>;
}
