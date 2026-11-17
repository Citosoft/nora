import { useId } from "react";
import type { PersonalWorkspaceArtProps } from "@/components/app/types/accountAvatar.types";

/** Abstract artwork for the Personal workspace when there is no signed-in photo to show. */
export function PersonalWorkspaceArt({ className }: PersonalWorkspaceArtProps) {
  const id = useId();
  const ids = { base: `${id}-base`, warm: `${id}-warm`, cool: `${id}-cool`, orb: `${id}-orb` };
  return <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice" className={className}>
    <defs>
      <linearGradient id={ids.base} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#1e1b4b" /><stop offset="0.55" stopColor="#4c1d95" /><stop offset="1" stopColor="#7c3aed" />
      </linearGradient>
      <radialGradient id={ids.warm} cx="0.85" cy="0.15" r="0.6">
        <stop offset="0" stopColor="#fb7185" stopOpacity="0.95" /><stop offset="1" stopColor="#fb7185" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={ids.cool} cx="0.1" cy="0.95" r="0.65">
        <stop offset="0" stopColor="#22d3ee" stopOpacity="0.85" /><stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={ids.orb} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fef3c7" /><stop offset="1" stopColor="#fdba74" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" fill={`url(#${ids.base})`} />
    <rect width="32" height="32" fill={`url(#${ids.warm})`} />
    <rect width="32" height="32" fill={`url(#${ids.cool})`} />
    <path d="M-2 25 C 8 17, 18 31, 34 19" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="12" cy="12.5" r="5" fill={`url(#${ids.orb})`} />
    <circle cx="21.5" cy="18" r="3.25" fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1.2" />
  </svg>;
}
