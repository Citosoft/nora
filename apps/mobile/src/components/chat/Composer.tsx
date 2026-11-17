import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ComposerProps } from "@/types/composer.types";
import type { IconName } from "@/types/icon.types";
import type { Theme } from "@/types/theme.types";
import { hairline, layout, spacing, type } from "@/theme/tokens";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Icon } from "@/components/common/Icon";

/** ChatGPT-style message field docked above the home indicator: text on top, then a context menu and one round action button. */
export function Composer({ disabledReason, draft, onDraftChange, onSend, placeholder = "Message Nora", context, stop, autoFocus = false }: ComposerProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [sending, setSending] = useState(false);
  const hasText = draft.trim().length > 0;
  const canSend = !disabledReason && hasText && !sending;
  const showStop = stop && !hasText;
  const send = async (): Promise<void> => {
    if (!canSend) return;
    setSending(true);
    try {
      await onSend(draft);
    } finally {
      setSending(false);
    }
  };
  return (
    <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View style={styles.field}>
        <TextInput value={draft} onChangeText={onDraftChange} multiline editable={!disabledReason} autoFocus={autoFocus}
          placeholder={disabledReason ? "Can't send right now" : placeholder} placeholderTextColor={colors.textMuted} textAlignVertical="top"
          accessibilityLabel="Message" accessibilityHint={disabledReason ?? undefined} style={styles.input} maxLength={100_000} />
        <View style={styles.toolbar}>
          <View style={styles.context}>{context}</View>
          {showStop ? (
            <RoundAction label="Stop the agent" icon="stop" busy={stop.busy} disabled={stop.disabled} onPress={stop.onStop} filled={colors.text} glyph={colors.background} />
          ) : (
            <RoundAction label="Send message" icon="arrow-up" busy={sending} disabled={!canSend} onPress={() => void send()}
              filled={canSend || sending ? colors.text : colors.pressed} glyph={canSend || sending ? colors.background : colors.textMuted} />
          )}
        </View>
      </View>
      {disabledReason ? <Text selectable style={styles.reason}>{disabledReason}</Text> : null}
    </View>
  );
}

interface RoundActionProps {
  label: string;
  icon: IconName;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
  filled: string;
  glyph: string;
}

function RoundAction({ label, icon, busy, disabled, onPress, filled, glyph }: RoundActionProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy}
      onPress={onPress} hitSlop={6} style={({ pressed }) => [styles.round, { backgroundColor: filled }, pressed && styles.pressed]}>
      {busy ? <ActivityIndicator size="small" color={glyph} /> : <Icon name={icon} size={icon === "stop" ? 15 : 22} color={glyph} />}
    </Pressable>
  );
}

const createStyles = (theme: Theme) => ({
  dock: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, gap: spacing.xs },
  field: { borderRadius: 30, backgroundColor: theme.colors.composer, paddingTop: spacing.lg, gap: spacing.xs,
    borderWidth: theme.scheme === "dark" ? 0 : hairline, borderColor: theme.colors.separator,
    boxShadow: theme.scheme === "dark" ? "none" : `0px 4px 16px ${theme.colors.shadow}` },
  input: { ...type.body, fontSize: 18, lineHeight: 24, minHeight: 26, maxHeight: layout.composerMaxHeight, color: theme.colors.text,
    paddingTop: 0, paddingBottom: 0, paddingHorizontal: spacing.xl, outlineWidth: 0 },
  toolbar: { minHeight: 56, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "flex-end" as const, gap: spacing.sm,
    paddingLeft: spacing.md, paddingRight: spacing.sm + 2, paddingBottom: spacing.sm },
  context: { flexShrink: 1, minWidth: 0, alignItems: "flex-end" as const },
  round: { width: 42, height: 42, borderRadius: 21, alignItems: "center" as const, justifyContent: "center" as const },
  pressed: { opacity: 0.7 },
  reason: { ...type.footnote, color: theme.colors.textMuted, textAlign: "center" as const }
});
