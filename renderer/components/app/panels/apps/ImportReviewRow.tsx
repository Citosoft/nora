import type { ImportReviewRowProps } from "@/components/app/types/appsView.types";

/** One row of the install review: a leading mark, a label, and a control aligned to the same right edge as every other row. */
export function ImportReviewRow({ leading, label, title, children }: ImportReviewRowProps) {
  return <li className="flex min-h-12 items-center gap-3 px-3 py-2" title={title}>
    <span className="flex size-6 shrink-0 items-center justify-center">{leading}</span>
    <div className="flex min-w-0 flex-1 items-center gap-2">{label}</div>
    <div className="w-44 shrink-0">{children}</div>
  </li>;
}
