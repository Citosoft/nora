import { Text } from "react-native";
import type { InlineNode } from "@/types/markdown.types";
import type { Theme } from "@/types/theme.types";
import { monospaceFont, radii, type } from "@/theme/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { openExternalUrl } from "@/platform/openExternalUrl";

/** Renders inline Markdown nodes as nested native Text; links open outside the app. */
export function MarkdownInline({ nodes }: { nodes: readonly InlineNode[] }) {
  const styles = useThemedStyles(createStyles);
  return (
    <>
      {nodes.map((node, index) => {
        switch (node.kind) {
          case "text": return <Text key={index}>{node.text}</Text>;
          case "strong": return <Text key={index} style={styles.strong}><MarkdownInline nodes={node.children} /></Text>;
          case "emphasis": return <Text key={index} style={styles.emphasis}><MarkdownInline nodes={node.children} /></Text>;
          case "code": return <Text key={index} style={styles.code}>{node.text}</Text>;
          case "link":
            return (
              <Text key={index} accessibilityRole="link" style={styles.link}
                onPress={() => void openExternalUrl(node.href)} accessibilityHint={`Opens ${node.href}`}>
                <MarkdownInline nodes={node.children} />
              </Text>
            );
        }
      })}
    </>
  );
}

// Inline code keeps only the subheadline size: line height is inherited from the surrounding paragraph so lines stay even.
const createStyles = (theme: Theme) => ({
  strong: { fontWeight: "700" as const },
  emphasis: { fontStyle: "italic" as const },
  code: { fontFamily: monospaceFont, fontSize: type.subheadline.fontSize, backgroundColor: theme.colors.fill, borderRadius: radii.xs },
  link: { color: theme.colors.text, textDecorationLine: "underline" as const }
});
