import { memo, useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import type { MarkdownBlock } from "@/types/markdown.types";
import type { Theme } from "@/types/theme.types";
import { hairline, monospaceFont, radii, spacing, type } from "@/theme/tokens";
import { parseMarkdown } from "@/markdown/parseMarkdown";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MarkdownInline } from "./MarkdownInline";

const headingStyles = [type.title2, type.title3, type.headline, type.headline, type.headline, type.headline];

/** Safe Markdown for agent replies: parsed into a small block model, rendered with native views (never HTML). */
export const Markdown = memo(function Markdown({ text }: { text: string }) {
  const blocks = useMemo(() => parseMarkdown(text), [text]);
  return <View style={{ gap: spacing.sm }}>{blocks.map((block, index) => <Block key={index} block={block} />)}</View>;
});

function Block({ block }: { block: MarkdownBlock }) {
  const styles = useThemedStyles(createStyles);
  switch (block.kind) {
    case "heading":
      return <Text accessibilityRole="header" style={[styles.text, headingStyles[block.level - 1] ?? type.headline, styles.heading]}>
        <MarkdownInline nodes={block.inline} /></Text>;
    case "paragraph":
      return <Text style={styles.text} selectable><MarkdownInline nodes={block.inline} /></Text>;
    case "code":
      return (
        <ScrollView horizontal style={styles.codeBlock} accessibilityLabel={block.language ? `${block.language} code` : "Code"}>
          <Text style={styles.code} selectable>{block.text}</Text>
        </ScrollView>
      );
    case "list":
      return (
        <View style={{ gap: spacing.xs }}>
          {block.items.map((item, index) => (
            <View key={index} style={styles.listRow}>
              <Text style={styles.text}>{block.ordered ? `${block.start + index}.` : "•"}</Text>
              <Text style={[styles.text, styles.flex]} selectable><MarkdownInline nodes={item} /></Text>
            </View>
          ))}
        </View>
      );
    case "quote":
      return <View style={styles.quote}><Text style={[styles.text, styles.muted]} selectable><MarkdownInline nodes={block.inline} /></Text></View>;
    case "table":
      return (
        <ScrollView horizontal>
          <View style={styles.table}>
            {[block.header, ...block.rows].map((row, rowIndex) => (
              <View key={rowIndex} style={[styles.tableRow, rowIndex === 0 && styles.tableHeader]}>
                {row.map((cell, cellIndex) => (
                  <Text key={cellIndex} style={[styles.text, styles.tableCell, rowIndex === 0 && { fontWeight: "700" }]} selectable>
                    <MarkdownInline nodes={cell} />
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      );
    case "rule":
      return <View style={styles.rule} />;
  }
}

const createStyles = (theme: Theme) => ({
  text: { ...type.body, lineHeight: 25, color: theme.colors.text },
  heading: { marginTop: spacing.xs },
  muted: { color: theme.colors.textMuted },
  flex: { flex: 1 },
  codeBlock: { backgroundColor: theme.colors.codeBackground, borderRadius: radii.md, padding: spacing.md + 2 },
  code: { fontFamily: monospaceFont, color: theme.colors.text, fontSize: 13, lineHeight: 19 },
  listRow: { flexDirection: "row" as const, gap: spacing.sm },
  quote: { borderLeftWidth: 3, borderLeftColor: theme.colors.separator, paddingLeft: spacing.md },
  table: { borderWidth: hairline, borderColor: theme.colors.separator, borderRadius: radii.sm, overflow: "hidden" as const },
  tableRow: { flexDirection: "row" as const, borderTopWidth: hairline, borderTopColor: theme.colors.separator },
  tableHeader: { borderTopWidth: 0, backgroundColor: theme.colors.codeBackground },
  tableCell: { minWidth: 96, maxWidth: 260, padding: spacing.sm },
  rule: { height: hairline, backgroundColor: theme.colors.separator }
});
