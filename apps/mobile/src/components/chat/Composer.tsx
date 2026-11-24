import { buildComposerInstruction } from "@shared/conversations/composerInstruction";
import { useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ComposerProps } from "@/types/composer.types";
import type { Theme } from "@/types/theme.types";
import { hairline, layout, spacing, type } from "@/theme/tokens";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { ActionSheet } from "@/components/common/ActionSheet";
import { ComposerAction } from "./ComposerAction";
import { ComposerAttachments } from "./ComposerAttachments";

/** Compact input bar with attachments above and provider/settings context below. */
export function Composer({ disabledReason, draft, onDraftChange, onSend, placeholder = "Message Nora", context, attachments, stop, autoFocus = false }: ComposerProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [inputHeight, setInputHeight] = useState(44);
  const locked = useRef(false);
  const hasContent = Boolean(draft.trim() || attachments?.files.length);
  const canSend = !disabledReason && hasContent && !sending && !attachments?.busy;
  const showStop = stop && !hasContent;
  const send = async (): Promise<void> => {
    if (!canSend || locked.current) return;
    locked.current = true;
    setSending(true); setError(null);
    try {
      await onSend(buildComposerInstruction(draft, attachments?.files.map((entry) => entry.file)));
      onDraftChange("");
      attachments?.clear();
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Your message could not be saved. Try again."); }
    finally { locked.current = false; setSending(false); }
  };
  return <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
    {attachments ? <ComposerAttachments value={attachments} disabled={sending} /> : null}
    <View style={styles.field}>
      {attachments ? <ComposerAction label="Add photos or files" icon="add" busy={attachments.busy} disabled={Boolean(disabledReason) || sending}
        onPress={() => setPicking(true)} /> : null}
      <TextInput value={draft} onChangeText={onDraftChange} multiline editable={!disabledReason && !sending} autoFocus={autoFocus}
        placeholder={disabledReason ? "Can't send right now" : placeholder} placeholderTextColor={colors.textMuted} textAlignVertical="top"
        accessibilityLabel="Message" accessibilityHint={disabledReason ?? undefined} style={[styles.input, { height: inputHeight }]} maxLength={100_000}
        onContentSizeChange={(event) => setInputHeight(Math.min(layout.composerMaxHeight, Math.max(44, event.nativeEvent.contentSize.height)))} />
      {showStop ? <ComposerAction label="Stop the agent" icon="stop" busy={stop.busy} disabled={stop.disabled} onPress={stop.onStop} filled />
        : <ComposerAction label="Send message" icon="arrow-up" busy={sending} disabled={!canSend} onPress={() => void send()} filled />}
    </View>
    {context ? <View style={styles.context}>{context}</View> : null}
    {disabledReason || error ? <Text selectable style={[styles.reason, error && styles.error]} accessibilityRole={error ? "alert" : undefined}>{error ?? disabledReason}</Text> : null}
    <ActionSheet visible={picking} title="Add to your message" message="Up to 10 files, 20 MB each" onClose={() => setPicking(false)}
      options={[
        { afterDismiss: true, label: "Photo library", icon: "images-outline", onPress: () => void attachments?.pick("photos") },
        { afterDismiss: true, label: "Take a photo", icon: "camera-outline", onPress: () => void attachments?.pick("camera") },
        { afterDismiss: true, label: "Browse files", icon: "folder-open-outline", onPress: () => void attachments?.pick("files") }
      ]} />
  </View>;
}

const createStyles = (theme: Theme) => ({
  dock: { width: "100%" as const, maxWidth: layout.chatColumnWidth, alignSelf: "center" as const, paddingHorizontal: spacing.md, paddingTop: spacing.xs, gap: spacing.xs },
  field: { flexDirection: "row" as const, alignItems: "flex-end" as const, borderRadius: 26, padding: spacing.xxs, backgroundColor: theme.colors.composer,
    borderWidth: hairline, borderColor: theme.colors.separator },
  input: { ...type.composer, flex: 1, minWidth: 0, minHeight: 44, maxHeight: layout.composerMaxHeight, color: theme.colors.text,
    paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.xs, outlineWidth: 0 },
  context: { minWidth: 0, width: "100%" as const },
  reason: { ...type.footnote, color: theme.colors.textMuted, textAlign: "center" as const },
  error: { color: theme.colors.danger }
});
