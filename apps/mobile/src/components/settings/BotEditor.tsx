import { useRef, useState } from "react";
import { Modal, View } from "react-native";
import { BOT_AVATAR_EYES, BOT_AVATAR_PALETTES, BOT_AVATAR_SHAPES, BOT_NAME_MAX, BOT_ROLE_MAX, BOT_INSTRUCTIONS_MAX } from "@shared/bots/contracts";
import { saveRemoteBotSchema } from "@shared/remote-access/management";
import type { BotEditorProps } from "@/types/botSettings.types";
import { errorMessage } from "@/api/http/remoteRequestError";
import { KeyboardAvoidingArea } from "@/components/common/KeyboardAvoidingArea";
import { Screen } from "@/components/common/Screen";
import { Inset } from "@/components/common/Inset";
import { TextField } from "@/components/common/TextField";
import { ListSection } from "@/components/common/ListSection";
import { ListRow } from "@/components/common/ListRow";
import { NavButton } from "@/components/common/NavButton";
import { Banner } from "@/components/common/Banner";
import { BotAvatar } from "@/components/common/BotAvatar";
import { spacing } from "@/theme/tokens";
import { useTheme } from "@/hooks/useTheme";

const nextOption = <T,>(options: readonly T[], current: T | undefined): T | undefined => options[((current === undefined ? -1 : options.indexOf(current)) + 1) % options.length];

export function BotEditor({ initial, projects, onSave, onClose }: BotEditorProps) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const { colors } = useTheme();
  const close = (): void => { if (!pending.current) onClose(); };
  const save = async (): Promise<void> => {
    if (pending.current) return;
    const parsed = saveRemoteBotSchema.safeParse(draft);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the bot details."); return; }
    pending.current = true;
    setSaving(true);
    setError(null);
    try { await onSave(parsed.data); onClose(); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { pending.current = false; setSaving(false); }
  };
  return <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
    <KeyboardAvoidingArea><Screen title={initial.revision === null ? "Create bot" : "Edit bot"}
      leading={<NavButton label="Cancel" onPress={close} disabled={saving} />}
      trailing={<NavButton label="Save" prominent onPress={() => void save()} busy={saving} disabled={saving || !draft.name.trim()} />}>
      <View pointerEvents={saving ? "none" : "auto"} accessibilityState={{ busy: saving }} style={{ gap: spacing.lg, backgroundColor: colors.groupedBackground }}>
        <Inset>
          {error ? <Banner tone="danger" title="Couldn’t save bot" message={error} /> : null}
          <TextField label="Name" value={draft.name} maxLength={BOT_NAME_MAX} onChangeText={(name) => setDraft({ ...draft, name })} />
          <TextField label="Role" value={draft.role} maxLength={BOT_ROLE_MAX} onChangeText={(role) => setDraft({ ...draft, role })} />
          <TextField label="Instructions" value={draft.instructions} multiline maxLength={BOT_INSTRUCTIONS_MAX}
            onChangeText={(instructions) => setDraft({ ...draft, instructions })} />
        </Inset>
        <ListSection header="Avatar" footer="Tap a row to cycle through the available styles.">
          <ListRow title={draft.name.trim() || "New bot"} leading={<BotAvatar name={draft.name.trim() || "New bot"} avatar={draft.avatar} size={36} />} />
          <ListRow title="Colour" value={draft.avatar.palette ?? "From avatar seed"}
            onPress={() => setDraft({ ...draft, avatar: { ...draft.avatar, palette: nextOption(BOT_AVATAR_PALETTES, draft.avatar.palette) } })} />
          <ListRow title="Shape" value={draft.avatar.shape ?? "From avatar seed"}
            onPress={() => setDraft({ ...draft, avatar: { ...draft.avatar, shape: nextOption(BOT_AVATAR_SHAPES, draft.avatar.shape) } })} />
          <ListRow title="Eyes" value={draft.avatar.eyes ?? "From avatar seed"}
            onPress={() => setDraft({ ...draft, avatar: { ...draft.avatar, eyes: nextOption(BOT_AVATAR_EYES, draft.avatar.eyes) } })} />
        </ListSection>
        {initial.revision === null ? <ListSection header="Availability" footer="New bots use this computer’s default model. Workspace bots are private to you.">
          <ListRow title="Every workspace" accessory={draft.scope.kind === "global" ? "checkmark" : "none"}
            onPress={() => setDraft({ ...draft, scope: { kind: "global" } })} />
          {projects.map((project) => <ListRow key={project.id} title={project.name}
            accessory={draft.scope.kind === "workspace" && draft.scope.workspaceId === project.id ? "checkmark" : "none"}
            onPress={() => setDraft({ ...draft, scope: { kind: "workspace", workspaceId: project.id, storage: "private" } })} />)}
        </ListSection> : <ListSection footer="The bot’s model, permissions, connections, and availability are preserved.">
          <ListRow title="Availability" value={draft.scope.kind === "global" ? "Every workspace" : projects.find((project) => draft.scope.kind === "workspace" && project.id === draft.scope.workspaceId)?.name ?? "Workspace"} />
        </ListSection>}
      </View>
    </Screen></KeyboardAvoidingArea>
  </Modal>;
}
