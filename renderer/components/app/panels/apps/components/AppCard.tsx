import { useMemo, useState } from "react";
import type { ComponentFn } from "@json-render/react";
import { useStateValue } from "@json-render/react";
import type { AppCatalog } from "@shared/apps/catalog";
import type { AppSourceState } from "@shared/types/apps/apps.types";
import { adjacentAppPanelMove, moveAppPanel } from "@shared/apps/panelLayout";
import { GripVertical, Pencil } from "lucide-react";
import { useAppBuilderPick } from "@/components/app/context/appBuilderPickContext";
import { useAppRuntimeContext } from "@/components/app/context/appRuntimeContext";
import { useAppPanelLayout } from "@/components/app/hooks/useAppPanelLayout";
import { renderedPanelId } from "@/components/app/logic/apps/panelLayout";
import { propText } from "@/components/app/logic/apps/propText";
import { cn } from "@/lib/utils";
import { SourceState } from "../SourceState";

const PANEL_DRAG_TYPE = "application/x-nora-app-panel";

/** A card follows its source: while that source loads or fails, the state shows over the card's content. */
export const AppCard: ComponentFn<AppCatalog, "Card"> = ({ props, children }) => {
  const sourceId = propText(props.source);
  const state = useStateValue<AppSourceState>(`/sourceStatus/${sourceId}`);
  const title = propText(props.title), description = propText(props.description);
  const pick = useAppBuilderPick();
  const pickable = !!pick && !!title;
  const runtime = useAppRuntimeContext();
  const layout = useAppPanelLayout();
  const id = renderedPanelId(props);
  const [over, setOver] = useState<"before" | "after" | null>(null);
  const movable = !!id && !!layout;
  const label = title || "Untitled panel";
  const canDrop = useMemo(() => {
    if (!layout?.ui || !layout.dragging || layout.dragging === id || layout.saving) return false;
    try { moveAppPanel(layout.ui, { panelId: layout.dragging, targetId: id, placement: "before" }); return true; }
    catch { return false; }
  }, [layout?.ui, layout?.dragging, layout?.saving, id]);
  return <section className={cn("group/card relative flex min-w-0 flex-col rounded-lg border border-border/70 bg-card text-card-foreground", (pickable || movable) && "transition hover:border-primary/40", canDrop && over && "border-primary")}
    onDragOver={movable ? (event) => {
      if (!event.dataTransfer.types.includes(PANEL_DRAG_TYPE) || !canDrop) return;
      event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = "move";
      const bounds = event.currentTarget.getBoundingClientRect();
      setOver(event.clientY < bounds.top + bounds.height / 2 ? "before" : "after");
    } : undefined}
    onDragLeave={(event) => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setOver(null); }}
    onDrop={movable ? (event) => {
      setOver(null);
      if (!canDrop || !layout?.dragging || event.dataTransfer.getData(PANEL_DRAG_TYPE) !== layout.dragging) return;
      event.preventDefault(); event.stopPropagation();
      const bounds = event.currentTarget.getBoundingClientRect();
      layout.move({ panelId: layout.dragging, targetId: id, placement: event.clientY < bounds.top + bounds.height / 2 ? "before" : "after" });
    } : undefined}>
    {canDrop && over && <div aria-hidden="true" className={cn("pointer-events-none absolute inset-x-0 h-1 rounded-full bg-primary", over === "before" ? "-top-2.5" : "-bottom-2.5")} />}
    {(title || description) && <header className={cn("flex flex-col gap-1 px-4 pt-4", pickable ? "pr-32" : movable && "pr-12")}>
      {title && <h3 className="text-sm font-semibold leading-tight">{title}</h3>}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </header>}
    {(pickable || movable) && <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-border/70 bg-background/90 px-1 py-0.5 text-[10px] text-muted-foreground opacity-0 shadow-sm transition focus-within:opacity-100 group-hover/card:opacity-100">
      {movable && <button type="button" draggable={!layout.saving} aria-disabled={layout.saving} aria-label={`Move ${label}`}
        aria-description="Drag onto another panel, or use arrow keys to move within this layout. Changes save automatically."
        aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
        title="Drag to move. Use arrow keys to move before or after another panel."
        className="cursor-grab rounded-full p-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-disabled:opacity-50 active:cursor-grabbing"
        onDragStart={(event) => {
          if (layout.saving) { event.preventDefault(); return; }
          event.stopPropagation(); event.dataTransfer.setData(PANEL_DRAG_TYPE, id); event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setDragImage(event.currentTarget.closest("section") ?? event.currentTarget, 16, 16);
          layout.setDragging(id);
        }}
        onDragEnd={() => { layout.setDragging(null); setOver(null); }}
        onKeyDown={(event) => {
          if (layout.saving) return;
          const previous = event.key === "ArrowUp" || event.key === "ArrowLeft";
          const next = event.key === "ArrowDown" || event.key === "ArrowRight";
          if ((!previous && !next) || !layout.ui) return;
          event.preventDefault(); event.stopPropagation();
          const move = adjacentAppPanelMove(layout.ui, id, previous ? "previous" : "next");
          if (move) layout.move(move);
        }}><GripVertical className="size-3.5" aria-hidden="true" /></button>}
      {pickable && <button type="button" onClick={() => pick(title)} aria-label={`Change the ${title} card`}
        className="flex items-center gap-1 rounded-full px-1 py-0.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Pencil className="size-3" aria-hidden="true" />Change</button>}
    </div>}
    <div className={cn("flex min-h-0 flex-1 flex-col gap-3 p-4", movable && !title && !description && "pt-10")}>{sourceId ? <SourceState state={state} onLoadMore={() => runtime.loadMore(sourceId)}>{children}</SourceState> : children}</div>
  </section>;
};

