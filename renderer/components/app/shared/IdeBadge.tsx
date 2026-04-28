import { SiCursor } from "@icons-pack/react-simple-icons";
import type { InstalledIde } from "@shared/appTypes";

export function IdeBadge({
  ide,
  className = "size-3.5",
  iconClassName = "size-2.5"
}: {
  ide: InstalledIde;
  className?: string;
  iconClassName?: string;
}) {
  if (ide.id === "cursor") {
    return (
      <div className={`grid ${className} place-items-center rounded-[3px] bg-[#111111] text-white`}>
        <SiCursor className={iconClassName} aria-hidden="true" />
      </div>
    );
  }

  if (ide.iconDataUrl) {
    return (
      <img
        src={ide.iconDataUrl}
        alt=""
        className={`${className} rounded-[3px] object-contain`}
        draggable={false}
      />
    );
  }

  return (
    <div className={`grid ${className} place-items-center rounded-[3px] bg-primary/15 text-[8px] font-semibold uppercase text-primary`}>
      {ide.name.slice(0, 1)}
    </div>
  );
}
