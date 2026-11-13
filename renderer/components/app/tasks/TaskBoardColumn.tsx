import { useState } from "react";
import { Pencil, Save, Trash2, X } from "lucide-react";
import type { TaskBoardColumnProps } from "@/components/app/types/taskCenter.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function TaskBoardColumn({
  section,
  count,
  canDelete,
  canDrop,
  onDrop,
  onRename,
  onDelete,
  children
}: TaskBoardColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(section.title);

  const submitRename = (): void => {
    const next = title.trim();
    if (next && next !== section.title) void onRename(next);
    setIsEditing(false);
  };

  return (
    <section
      aria-label={section.title}
      className={cn(
        "flex w-[290px] shrink-0 flex-col rounded-lg bg-muted/25 transition-colors",
        canDrop && "ring-1 ring-inset ring-border"
      )}
      onDragOver={(event) => {
        if (canDrop) event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (canDrop) onDrop();
      }}
    >
      <div className="flex min-h-14 items-center justify-between gap-2 px-3 py-3">
        {isEditing ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-1"
            onSubmit={(event) => {
              event.preventDefault();
              submitRename();
            }}
          >
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setIsEditing(false);
                }
              }}
              className="h-8 min-w-0 text-xs"
              autoFocus
              aria-label={`Rename ${section.title}`}
            />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              aria-label="Save section name"
            >
              <Save className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={() => setIsEditing(false)}
              aria-label="Cancel rename"
            >
              <X className="size-3.5" />
            </Button>
          </form>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-xs font-medium" title={section.title}>
                {section.title}
              </h2>
              <span className="text-[11px] tabular-nums text-muted-foreground">{count}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                onClick={() => {
                  setTitle(section.title);
                  setIsEditing(true);
                }}
                aria-label={`Rename ${section.title}`}
              >
                <Pencil className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                disabled={!canDelete}
                onClick={() => {
                  if (window.confirm(`Delete "${section.title}" and move its tasks to the first remaining section?`))
                    void onDelete();
                }}
                aria-label={`Delete ${section.title}`}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          </>
        )}
      </div>
      <div className="min-h-[240px] flex-1 space-y-2 px-2 pb-2">{children}</div>
    </section>
  );
}
