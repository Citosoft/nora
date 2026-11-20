import type { ToolImageEntryProps } from "@/components/app/types/toolImage.types";
import { ToolImageFigure } from "./ToolImageFigure";

/** The images a tool call produced, shown in the thread under the call that made them. */
export function ToolImageEntry({ tool, paths, host, onOpen }: ToolImageEntryProps) {
  return <div className="min-w-0 space-y-3" aria-label={`Images from ${tool.label}`}>
    {paths.map((path) => <ToolImageFigure key={path} tool={tool} path={path} host={host} onOpen={onOpen} />)}
  </div>;
}
