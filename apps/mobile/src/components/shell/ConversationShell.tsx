import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import type { ConversationShellProps } from "@/types/sidebar.types";
import { routes } from "@/navigation/routes";
import { useRuntimeSession } from "@/hooks/useRuntimeSession";
import { useTheme } from "@/hooks/useTheme";
import { ConnectionBanner } from "@/components/runtimes/ConnectionBanner";
import { RuntimeLookupState } from "@/components/runtimes/RuntimeLookupState";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatTopBar } from "./ChatTopBar";

/** Frame for the new-chat and chat screens: top bar, slide-out sidebar of chats, connection notice, then content. */
export function ConversationShell({ runtimeId, activeConversationId, center, children }: ConversationShellProps) {
  const { colors } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const lookup = useRuntimeSession(runtimeId);
  const ready = lookup.status === "ready";
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ChatTopBar center={center} sidebarDisabled={!ready} onOpenSidebar={() => setSidebarOpen(true)}
        onNewChat={() => router.replace(routes.newConversation(runtimeId))} />
      {ready ? (
        <>
          <ConnectionBanner session={lookup.session} snapshot={lookup.snapshot} runtimeName={lookup.name} />
          <View style={{ flex: 1 }}>{children}</View>
          <Sidebar runtimeId={runtimeId} runtimeName={lookup.name} activeConversationId={activeConversationId} visible={sidebarOpen}
            onClose={() => setSidebarOpen(false)} />
        </>
      ) : <RuntimeLookupState lookup={lookup} />}
    </View>
  );
}
