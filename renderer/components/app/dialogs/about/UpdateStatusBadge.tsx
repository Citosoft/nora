import type { AboutUpdateTone, UpdateStatusBadgeProps } from "@/components/app/types/aboutDialog.types";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { ArrowUpCircle, CircleAlert, CircleCheck, Loader2, type LucideIcon } from "lucide-react";

const TONE_PRESENTATION: Record<AboutUpdateTone, { variant: BadgeProps["variant"]; icon: LucideIcon; spin?: boolean }> = {
  pending: { variant: "outline", icon: Loader2, spin: true },
  current: { variant: "success", icon: CircleCheck },
  available: { variant: "default", icon: ArrowUpCircle },
  error: { variant: "destructive", icon: CircleAlert }
};

export function UpdateStatusBadge({ summary }: UpdateStatusBadgeProps) {
  const { variant, icon: Icon, spin } = TONE_PRESENTATION[summary.tone];

  return (
    <Badge variant={variant} className="gap-1.5 px-2 font-normal" role="status">
      <Icon className={spin ? "size-3 animate-spin" : "size-3"} aria-hidden="true" />
      {summary.label}
    </Badge>
  );
}
