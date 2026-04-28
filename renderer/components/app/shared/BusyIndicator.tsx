import { cn } from "@/lib/utils";

export function BusyIndicator({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn("text-primary", className)} fill="none" aria-hidden="true">
      <rect x="3" y="3" width="10" height="10" rx="1.5" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.25" />
      <circle r="1.4" fill="currentColor">
        <animateMotion dur="0.85s" repeatCount="indefinite" path="M3,3 H13 V13 H3 Z" />
      </circle>
    </svg>
  );
}

