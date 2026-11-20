import type { ReactNode } from "react";
import { View } from "react-native";
import { useIsWideLayout } from "@/hooks/useIsWideLayout";
import { SidebarColumn } from "./SidebarColumn";

interface SidebarFrameProps {
  runtimeId: string;
  /** Null while the computer is still connecting: there is nothing to list yet, so no sidebar. */
  runtimeName: string | null;
  activeConversationId: string | null;
  children: ReactNode;
}

/** On desktop-sized windows, places the permanent sidebar beside a computer's screen; on small ones it is just the screen. */
export function SidebarFrame({ runtimeId, runtimeName, activeConversationId, children }: SidebarFrameProps) {
  const wide = useIsWideLayout();
  return (
    <View style={{ flex: 1, flexDirection: "row" }}>
      {wide && runtimeName !== null ? <SidebarColumn runtimeId={runtimeId} runtimeName={runtimeName} activeConversationId={activeConversationId} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
    </View>
  );
}
