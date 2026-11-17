import { Text, type TextStyle } from "react-native";
import type { InlineNode } from "@/types/markdown.types";
import { monospaceFont } from "@/theme/tokens";
import { useTheme } from "@/hooks/useTheme";
import { openExternalUrl } from "@/platform/openExternalUrl";

/** Renders inline Markdown nodes as nested native Text; links open outside the app. */
export function MarkdownInline({ nodes }: { nodes: readonly InlineNode[] }) {
  const { colors } = useTheme();
  const code: TextStyle = { fontFamily: monospaceFont, backgroundColor: colors.fill, fontSize: 15, borderRadius: 4 };
  return (
    <>
      {nodes.map((node, index) => {
        switch (node.kind) {
          case "text": return <Text key={index}>{node.text}</Text>;
          case "strong": return <Text key={index} style={{ fontWeight: "700" }}><MarkdownInline nodes={node.children} /></Text>;
          case "emphasis": return <Text key={index} style={{ fontStyle: "italic" }}><MarkdownInline nodes={node.children} /></Text>;
          case "code": return <Text key={index} style={code}>{node.text}</Text>;
          case "link":
            return (
              <Text key={index} accessibilityRole="link" style={{ color: colors.accent }}
                onPress={() => void openExternalUrl(node.href)} accessibilityHint={`Opens ${node.href}`}>
                <MarkdownInline nodes={node.children} />
              </Text>
            );
        }
      })}
    </>
  );
}
