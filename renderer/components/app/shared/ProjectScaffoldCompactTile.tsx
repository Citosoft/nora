import { Tooltip } from "@/components/ui/tooltip";
import { Check, Package } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type ProjectScaffoldCompactTileProps = {
  label: string;
  subtitle?: string | null;
  logoUrl?: string | null;
  selected: boolean;
  onClick: () => void;
  ariaLabel: string;
  tooltipContent: ReactNode;
};

export function ProjectScaffoldCompactTile({
  label,
  subtitle,
  logoUrl,
  selected,
  onClick,
  ariaLabel,
  tooltipContent
}: ProjectScaffoldCompactTileProps) {
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setLogoFailed(false);
  }, [logoUrl]);

  return (
    <Tooltip side="top" className="z-[40000] max-w-72" content={tooltipContent}>
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={[
          "flex h-20 w-full items-center gap-3 rounded-[6px] border px-3 py-3 text-left transition hover:border-primary/40 hover:bg-accent/30",
          selected ? "border-primary/60 bg-primary/10" : "border-border/70 bg-background/40"
        ].join(" ")}
      >
        <div className="grid size-9 shrink-0 place-items-center rounded-[5px] border border-border/70 bg-background/70">
          {logoUrl && !logoFailed ? (
            <img
              src={logoUrl}
              alt=""
              className="size-5 object-contain"
              draggable={false}
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <Package className="size-4 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium">{label}</div>
          {subtitle ? <div className="mt-1 truncate text-[11px] text-muted-foreground">{subtitle}</div> : null}
        </div>
        {selected ? <Check className="size-4 shrink-0 text-primary" /> : null}
      </button>
    </Tooltip>
  );
}
