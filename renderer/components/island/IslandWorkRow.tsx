import type { IslandWorkRowProps } from "@/components/app/types/island.types";
import { IslandIdentityIcon } from "./IslandIdentityIcon";
import { IslandPhaseIndicator } from "./IslandPhaseIndicator";

/** One thread or terminal agent in the expanded island; clicking it opens that work in Nora. */
export function IslandWorkRow({ item, onOpen }: IslandWorkRowProps) {
  return <li>
    <button type="button" onClick={() => onOpen(item)} aria-label={`Open ${item.title}: ${item.status}`}
      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none">
      <IslandIdentityIcon identity={item.identity} phase={item.phase} size={22} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-white">{item.title}</span>
        <span className="block truncate text-xs text-white/55">{item.status} · {item.workspaceName}</span>
      </span>
      <IslandPhaseIndicator phase={item.phase} size={14} />
    </button>
  </li>;
}
