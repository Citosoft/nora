import { Wifi } from "lucide-react";
import type { MobileRemoteDemoProps } from "@/components/app/types/remoteAccess.types";
import { MobileRemoteDemoScreen } from "./MobileRemoteDemoScreen";

/** A phone frame showing one moment of the remote app with sample data; remounting per scene replays its entrance. */
export function MobileRemoteDemo({ scene }: MobileRemoteDemoProps) {
  return <div className="mobile-remote-phone" aria-hidden="true">
    <div className="mobile-remote-screen flex flex-col">
      <div className="relative flex h-10 shrink-0 items-center justify-between px-6 text-[10px] font-semibold">
        <span>9:41</span>
        <span className="mobile-remote-island absolute left-1/2 top-2 -translate-x-1/2" />
        <Wifi className="size-3" />
      </div>
      <MobileRemoteDemoScreen scene={scene} />
      <div className="flex h-6 shrink-0 items-center justify-center"><span className="h-1 w-24 rounded-full bg-foreground/80" /></div>
    </div>
    <span className="mobile-remote-glare" />
  </div>;
}
