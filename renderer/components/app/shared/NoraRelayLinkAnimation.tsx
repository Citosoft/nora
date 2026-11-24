import { Laptop, Smartphone, Waypoints } from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { NoraRelayLinkAnimationProps } from "@/components/app/types/remoteAccess.types";

const packet = (path: string, delay: number): CSSProperties => ({ offsetPath: `path("${path}")`, animationDelay: `${delay}ms` });
const TO_COMPUTER = "M50 25 H150";
const TO_PHONE = "M150 31 H50";

/** Compact phone ↔ Nora Relay ↔ computer link, sharing the full Nora Relay diagram's styles. Decorative: callers state the link's status in text. */
export function NoraRelayLinkAnimation({ active, className }: NoraRelayLinkAnimationProps) {
  const lane = active ? "nora-relay-link" : "nora-relay-link-dashed";
  return <svg viewBox="0 0 200 56" aria-hidden="true" className={cn("nora-relay-diagram block h-auto w-full", className)}>
    {/* One lane per direction: the loops run half a cycle apart, so a shared line would make the packets meet head-on. */}
    <path d={TO_COMPUTER} className={lane} />
    <path d={TO_PHONE} className={lane} />
    {active && <>
      <circle r="2.5" className="nora-relay-packet" style={packet(TO_COMPUTER, 0)} />
      <circle r="2.5" className="nora-relay-packet nora-relay-packet-reply" style={packet(TO_PHONE, 1400)} />
    </>}
    {/* Opaque base under the translucent accent so packets pass behind the relay instead of through its icon. */}
    <rect x="86" y="14" width="28" height="28" rx="8" className="nora-relay-node" />
    <rect x="86" y="14" width="28" height="28" rx="8" className="nora-relay-node nora-relay-node-accent" />
    <Waypoints x="92" y="20" width="16" height="16" className="text-primary" />
    {([{ x: 6, icon: Smartphone }, { x: 150, icon: Laptop }] as const).map(({ x, icon: Icon }) => <g key={x}>
      <rect x={x} y="8" width="44" height="40" rx="10" className="nora-relay-node" />
      <Icon x={x + 12} y="18" width="20" height="20" className="text-muted-foreground" />
    </g>)}
  </svg>;
}
