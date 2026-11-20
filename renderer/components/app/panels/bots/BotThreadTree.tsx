import { useId, useState } from "react";
import { MessageSquare } from "lucide-react";
import { ThreadRow } from "@/components/app/panels/threads/ThreadRow";
import type { BotThreadTreeProps, BotThreadTreeRowProps } from "@/components/app/types/botNavigation.types";

/** Nested lists and connector lines show which thread owns each spawned task. */
export function BotThreadTree({ nodes, now, onOpen, onTogglePin, nested = false }: BotThreadTreeProps) {
  return <ul className={nested ? "space-y-0.5 [&_.thread-title]:text-xs" : "space-y-0.5"}>{nodes.map((node) =>
    <BotThreadTreeRow key={node.row.id} node={node} nested={nested} now={now} onOpen={onOpen} onTogglePin={onTogglePin} />)}</ul>;
}

function BotThreadTreeRow({ node: { row, children }, nested, now, onOpen, onTogglePin }: BotThreadTreeRowProps) {
  const [expanded, setExpanded] = useState(true);
  const childrenId = useId();
  return <li>
    <ThreadRow row={{ ...row, bot: null, providerKind: nested ? row.providerKind : null }} now={now} workspace={null} request={null}
      disclosure={children.length ? { expanded, controls: childrenId, onToggle: () => setExpanded((current) => !current) } : undefined}
      leadingIcon={!nested && row.workThread ? <MessageSquare role="img" aria-label="Chat thread" className="size-4 shrink-0 text-muted-foreground"><title>Chat thread</title></MessageSquare> : undefined}
      onOpen={onOpen} onTogglePin={onTogglePin} />
    {children.length > 0 && <div id={childrenId} hidden={!expanded} className="ml-3 border-l border-border/60 pl-3" role="group" aria-label={`Threads started by ${row.title}`}>
      <BotThreadTree nested nodes={children} now={now} onOpen={onOpen} onTogglePin={onTogglePin} />
    </div>}
  </li>;
}
