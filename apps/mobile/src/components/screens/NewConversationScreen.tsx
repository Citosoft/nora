import { useComposerAttachments } from "@/hooks/useComposerAttachments";
import { useProviderPicker } from "@/hooks/useProviderPicker";
import { ProviderPicker } from "@/components/chat/ProviderPicker";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { ConnectedRuntime } from "@/types/runtimeSession.types";
import type { Theme } from "@/types/theme.types";
import { layout, spacing, type } from "@/theme/tokens";
import { capabilityGate } from "@/state/runtimeCompatibility";
import { titleFromInstruction } from "@/state/conversationTitle";
import { useCommandRunner } from "@/hooks/useCommandRunner";
import { useProjects } from "@/hooks/useProjects";
import { useRuntimeSession } from "@/hooks/useRuntimeSession";
import { useStartConversation } from "@/hooks/useStartConversation";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Banner } from "@/components/common/Banner";
import { KeyboardAvoidingArea } from "@/components/common/KeyboardAvoidingArea";
import { Button } from "@/components/common/Button";
import { Inset } from "@/components/common/Inset";
import { ProjectMenu } from "@/components/conversations/ProjectPicker";
import { UnsentConversationRow } from "@/components/conversations/UnsentConversationRow";
import { Composer } from "@/components/chat/Composer";
import { ComputerPill } from "@/components/shell/ComputerPill";
import { ConversationShell } from "@/components/shell/ConversationShell";

/** A computer's home, like ChatGPT's: an empty canvas with a prompt and the full composer; chats live in the sidebar. */
export function NewConversationScreen({ runtimeId, initialProjectId }: { runtimeId: string; initialProjectId: string | null }) {
  const lookup = useRuntimeSession(runtimeId);
  return (
    <ConversationShell runtimeId={runtimeId} activeConversationId={null} center={<ComputerPill runtimeId={runtimeId} />}>
      {lookup.status === "ready" ? (
        <NewConversationForm key={runtimeId} runtime={{ session: lookup.session, snapshot: lookup.snapshot, name: lookup.name }} runtimeId={runtimeId}
          initialProjectId={initialProjectId} />
      ) : null}
    </ConversationShell>
  );
}

function NewConversationForm({ runtime, runtimeId, initialProjectId }: { runtime: ConnectedRuntime; runtimeId: string; initialProjectId: string | null }) {
  const styles = useThemedStyles(createStyles);
  const projects = useProjects(runtime.session);
  const runner = useCommandRunner(runtime.session);
  const { start, retry, unsent, error } = useStartConversation(runner, runtimeId);
  const [projectChoice, setProjectChoice] = useState<string | null>(initialProjectId);
  const [instruction, setInstruction] = useState("");
  const info = runtime.snapshot.info.status === "ready" ? runtime.snapshot.info.value : null;
  const createGate = capabilityGate(info, "conversations.create");
  const sendGate = capabilityGate(info, "messages.send");
  const attachments = useComposerAttachments(runtime.session.client, capabilityGate(info, "attachments.upload"));
  const projectList = projects.state.status === "ready" ? projects.state.value : [];
  const selectedProject = projectList.find((project) => project.id === projectChoice) ?? projectList[0] ?? null;
  const pickerEnabled = capabilityGate(info, "providers.configure").enabled;
  const picker = useProviderPicker(runtime.session, selectedProject?.id ?? null, pickerEnabled);
  const disabledReason = !createGate.enabled || !sendGate.enabled ? createGate.reason ?? sendGate.reason
    : projects.state.status === "loading" ? "Loading projects…"
    : !selectedProject ? "Add a project in Nora Desktop to start chatting here." : picker.problem;

  const submit = async (text: string): Promise<void> => {
    if (disabledReason || !selectedProject) return;
    await start({ projectId: selectedProject.id, title: titleFromInstruction(instruction || attachments.files[0]?.file.name || text), instruction: text, ...(pickerEnabled && picker.value ? { provider: picker.value } : {}) });
  };
  return (
    <KeyboardAvoidingArea>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.heading} accessibilityRole="header">What shall we work on?</Text>
        </View>
        <View style={styles.notices}>
          {projects.state.status === "error" ? (
            <Inset>
              <Banner tone="danger" title="Couldn't load projects" message={projects.state.message} action={<Button label="Retry" compact onPress={projects.refresh} />} />
            </Inset>
          ) : null}
          {error ? <Inset><Banner tone="danger" title="Chat hasn't started" message={error} /></Inset> : null}
          {unsent.map((command) => <UnsentConversationRow key={command.key} command={command} sending={runner.inFlight.has(command.key)}
            onRetry={() => void retry(command)} onDiscard={() => void runner.discard(command.key)} />)}
        </View>
      </ScrollView>
      <Composer attachments={attachments} draft={instruction} onDraftChange={setInstruction} onSend={submit} disabledReason={disabledReason} placeholder="Ask Nora"
        context={<View>
          <ProjectMenu projects={projectList} selected={selectedProject} onSelect={setProjectChoice} />
          {pickerEnabled ? <ProviderPicker providers={picker.providers} value={picker.value} onChange={picker.onChange} /> : null}
          {picker.problem && projects.state.status === "ready" ? <Button label="Refresh models" compact variant="ghost" onPress={picker.refresh} /> : null}
        </View>} />
    </KeyboardAvoidingArea>
  );
}

const createStyles = (theme: Theme) => ({
  content: { flexGrow: 1, width: "100%" as const, maxWidth: layout.chatColumnWidth, alignSelf: "center" as const, paddingBottom: spacing.md },
  hero: { flexGrow: 1, alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxl },
  heading: { ...type.display, color: theme.colors.text, textAlign: "center" as const },
  notices: { gap: spacing.sm }
});
