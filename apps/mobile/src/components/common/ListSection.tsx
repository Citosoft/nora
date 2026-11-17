import { Children, Fragment, isValidElement } from "react";
import { Text, View } from "react-native";
import type { ListSectionProps } from "@/types/listUi.types";
import type { Theme } from "@/types/theme.types";
import { hairline, layout, radii, spacing, type } from "@/theme/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";

/** iOS inset grouped section: a caption header, rounded rows with inset hairlines, and an explanatory footer. */
export function ListSection({ header, footer, separatorInset = layout.gutter, children }: ListSectionProps) {
  const styles = useThemedStyles(createStyles);
  const rows = Children.toArray(children).filter(isValidElement);
  if (!rows.length && !footer) return null;
  return (
    <View style={styles.section}>
      {header ? <Text style={styles.header} accessibilityRole="header">{header}</Text> : null}
      {rows.length ? (
        <View style={styles.group}>
          {rows.map((row, index) => (
            <Fragment key={row.key ?? index}>
              {index > 0 ? <View style={[styles.separator, { marginLeft: separatorInset }]} /> : null}
              {row}
            </Fragment>
          ))}
        </View>
      ) : null}
      {typeof footer === "string" ? <Text style={styles.footer}>{footer}</Text> : footer ? <View style={styles.footerBox}>{footer}</View> : null}
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  section: { gap: spacing.sm - 2 },
  header: { ...type.body, color: theme.colors.textMuted, paddingHorizontal: layout.gutter + spacing.sm, paddingBottom: spacing.xxs },
  group: { marginHorizontal: layout.gutter, backgroundColor: theme.colors.composer, borderRadius: radii.xl, overflow: "hidden" as const },
  separator: { height: hairline, backgroundColor: theme.colors.separator },
  footer: { ...type.subheadline, color: theme.colors.textMuted, paddingHorizontal: layout.gutter + spacing.sm },
  footerBox: { paddingHorizontal: layout.gutter + spacing.sm }
});
