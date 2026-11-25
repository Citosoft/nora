import { useState } from "react";
import { Text, View } from "react-native";
import type { QuestionRequest, RequestResponse } from "@shared/types/conversation/contracts.types";
import type { Theme } from "@/types/theme.types";
import { spacing, type } from "@/theme/tokens";
import { buildAnswers, emptyDraft, toggleOption } from "@/state/questionAnswers";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Button } from "@/components/common/Button";
import { TextField } from "@/components/common/TextField";
import { QuestionOptions } from "./QuestionOptions";

interface QuestionRequestCardProps {
  request: QuestionRequest;
  disabled: boolean;
  busy: boolean;
  onDecide: (response: RequestResponse) => void;
}

/** Each question with its offered options (single or multiple choice) and a free-text answer where allowed. */
export function QuestionRequestCard({ request, disabled, busy, onDecide }: QuestionRequestCardProps) {
  const styles = useThemedStyles(createStyles);
  const [draft, setDraft] = useState(() => emptyDraft(request));
  const answers = buildAnswers(request, draft);
  return (
    <View style={styles.body}>
      {request.questions.map((question) => {
        const entry = draft[question.id] ?? { selected: [], other: "" };
        return (
          <View key={question.id} style={styles.question}>
            <Text style={styles.text}>{question.text}</Text>
            {question.multiple ? <Text style={styles.hint}>Choose all that apply.</Text> : null}
            {question.options.length ? (
              <QuestionOptions label={question.text} multiple={question.multiple} disabled={disabled || busy} selected={entry.selected}
                options={question.options}
                onToggle={(option) => setDraft((current) => toggleOption(current, question.id, option, question.multiple))} />
            ) : null}
            <TextField label={question.options.length ? "Other answer" : "Your answer"} value={entry.other} multiline
              hint={question.options.length && !question.multiple ? "Typing here replaces the choice above." : undefined}
              onChangeText={(other) => setDraft((current) => ({ ...current, [question.id]: { ...entry, other } }))} />
          </View>
        );
      })}
      <Button label="Send answer" variant="primary" disabled={disabled || !answers} busy={busy}
        onPress={() => answers && onDecide({ kind: "question", answers })} />
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  body: { gap: spacing.lg },
  question: { gap: spacing.sm },
  text: { ...type.headline, color: theme.colors.text },
  hint: { ...type.footnote, color: theme.colors.textMuted }
});
