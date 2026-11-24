import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import type { ComposerAttachments as Attachments } from "@/types/composerAttachments.types";
import type { Theme } from "@/types/theme.types";
import { hairline, radii, spacing, type } from "@/theme/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useTheme } from "@/hooks/useTheme";
import { attachmentSize } from "@/state/composerFiles";
import { Icon } from "@/components/common/Icon";

export function ComposerAttachments({ value, disabled }: { value: Attachments; disabled: boolean }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return <View style={styles.container}>
    {value.files.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.files}>
      {value.files.map(({ file, uri }) => <View key={file.id} style={styles.file}>
        {file.mimeType.startsWith("image/") ? <Image source={{ uri }} style={styles.image} accessibilityLabel={file.name} />
          : <View style={styles.image}><Icon name="document-text-outline" size={20} color={colors.textMuted} /></View>}
        <View style={styles.details}><Text style={styles.name} numberOfLines={1}>{file.name}</Text><Text style={styles.size}>{attachmentSize(file.size)}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${file.name}`} disabled={disabled || value.busy} onPress={() => value.remove(file.id)} style={styles.remove}>
          <Icon name="close" size={15} color={colors.textMuted} />
        </Pressable>
      </View>)}
    </ScrollView> : null}
    {value.busy ? <View style={styles.progress} accessibilityLiveRegion="polite"><ActivityIndicator size="small" color={colors.textMuted} /><Text style={styles.size}>{value.progress ?? "Choosing files…"}</Text></View> : null}
    {value.error ? <Text style={styles.error} accessibilityRole="alert">{value.error}</Text> : null}
  </View>;
}

const createStyles = (theme: Theme) => ({
  container: { gap: spacing.xs },
  files: { gap: spacing.sm },
  file: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm, paddingLeft: spacing.sm, borderRadius: radii.md,
    backgroundColor: theme.colors.surface, borderWidth: hairline, borderColor: theme.colors.separator },
  image: { width: 36, height: 36, borderRadius: radii.sm, alignItems: "center" as const, justifyContent: "center" as const, backgroundColor: theme.colors.fill },
  details: { maxWidth: 150, paddingVertical: spacing.sm },
  name: { ...type.footnote, fontWeight: "500" as const, color: theme.colors.text },
  size: { ...type.caption, color: theme.colors.textMuted },
  remove: { minWidth: 44, minHeight: 52, alignItems: "center" as const, justifyContent: "center" as const },
  progress: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm },
  error: { ...type.footnote, color: theme.colors.danger }
});
