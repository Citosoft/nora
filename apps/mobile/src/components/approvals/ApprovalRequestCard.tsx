import { Text, View } from "react-native";
import type { ApprovalRequest, RequestResponse } from "@shared/types/conversation/contracts.types";
import type { Theme } from "@/types/theme.types";
import type { ButtonVariant } from "@/components/common/Button";
import { spacing, type } from "@/theme/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Button } from "@/components/common/Button";
import { ApprovalDetailsView } from "./ApprovalDetailsView";

const scopeLabels = { once: "This time only", session: "For this conversation", persistent: "From now on" } as const;

function variantFor(intent: ApprovalRequest["options"][number]["intent"]): ButtonVariant {
  if (intent === "allow") return "primary";
  if (intent === "deny") return "danger";
  return "secondary";
}

interface ApprovalRequestCardProps {
  request: ApprovalRequest;
  disabled: boolean;
  busy: boolean;
  onDecide: (response: RequestResponse) => void;
}

/** The options exactly as the runtime offered them, as full-width stacked buttons with their scope underneath. */
export function ApprovalRequestCard({ request, disabled, busy, onDecide }: ApprovalRequestCardProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.body}>
      {request.details ? <ApprovalDetailsView details={request.details} /> : null}
      <View style={styles.options}>
        {request.options.map((option) => {
          const hint = [option.scope ? scopeLabels[option.scope] : null, option.description].filter(Boolean).join(" · ");
          return (
            <View key={option.id} style={styles.option}>
              <Button label={option.label} variant={variantFor(option.intent)} disabled={disabled || busy} busy={busy} accessibilityHint={hint || undefined}
                onPress={() => onDecide({ kind: "approval", optionId: option.id })} />
              {hint ? <Text style={styles.hint}>{hint}</Text> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  body: { gap: spacing.lg },
  options: { gap: spacing.sm },
  option: { gap: spacing.xs },
  hint: { ...type.caption, color: theme.colors.textMuted, textAlign: "center" as const }
});
