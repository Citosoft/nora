import type { BotInfoSectionProps } from "@/components/app/types/botNavigation.types";

export function BotInfoSection({ title, children }: BotInfoSectionProps) {
  return <section className="space-y-2 border-t px-5 py-4">
    <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
    {children}
  </section>;
}
