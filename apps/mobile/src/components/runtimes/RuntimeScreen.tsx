import type { ReactNode } from "react";
import type { ScreenProps } from "@/types/navigationUi.types";
import type { ConnectedRuntime } from "@/types/runtimeSession.types";
import { useRuntimeSession } from "@/hooks/useRuntimeSession";
import { SidebarFrame } from "@/components/sidebar/SidebarFrame";
import { Screen } from "@/components/common/Screen";
import { RuntimeLookupState } from "./RuntimeLookupState";
import { ConnectionBanner } from "./ConnectionBanner";

interface RuntimeScreenProps extends Omit<ScreenProps, "title" | "subtitle" | "trailing" | "children"> {
  runtimeId: string;
  title: (runtime: ConnectedRuntime) => string;
  subtitle?: (runtime: ConnectedRuntime) => string | undefined;
  trailing?: (runtime: ConnectedRuntime) => ReactNode;
  children: (runtime: ConnectedRuntime) => ReactNode;
}

/** Frame for every per-runtime screen: resolves the runtime, shows its connection state, then renders the content. */
export function RuntimeScreen({ runtimeId, title, subtitle, trailing, children, ...frame }: RuntimeScreenProps) {
  const lookup = useRuntimeSession(runtimeId);
  if (lookup.status !== "ready") {
    return (
      <Screen title={lookup.status === "loading" ? "Connecting…" : "Computer not found"} back={frame.back} variant={frame.variant}>
        <RuntimeLookupState lookup={lookup} />
      </Screen>
    );
  }
  const runtime: ConnectedRuntime = { session: lookup.session, snapshot: lookup.snapshot, name: lookup.name };
  return (
    <SidebarFrame runtimeId={runtimeId} runtimeName={runtime.name} activeConversationId={null}>
      <Screen {...frame} title={title(runtime)} subtitle={subtitle?.(runtime)} trailing={trailing?.(runtime)}>
        <ConnectionBanner session={runtime.session} snapshot={runtime.snapshot} runtimeName={runtime.name} />
        {children(runtime)}
      </Screen>
    </SidebarFrame>
  );
}

