import { Image, Text, View } from "react-native";
import { useUser } from "@clerk/expo";
import type { Theme } from "@/types/theme.types";
import { type } from "@/theme/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { ListRow } from "@/components/common/ListRow";
import { ListSection } from "@/components/common/ListSection";

const avatarSize = 52;

/** The signed-in account as the Settings header row (photo, name, email). */
export function AccountSection() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const name = user?.fullName || email || "Signed in";
  return (
    <ListSection footer="Every device signed in to this account can reach your computers. Nothing else is needed to pair.">
      <ListRow title={name} subtitle={email && user?.fullName ? email : "Nora account"} leading={<Avatar imageUrl={user?.imageUrl ?? null} name={name} />} />
    </ListSection>
  );
}

function Avatar({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  const styles = useThemedStyles(createStyles);
  if (imageUrl) return <Image source={{ uri: imageUrl }} style={styles.avatar} accessibilityIgnoresInvertColors accessible={false} />;
  return <View style={styles.avatar}><Text style={styles.initial}>{name.slice(0, 1).toUpperCase()}</Text></View>;
}

const createStyles = (theme: Theme) => ({
  avatar: { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, backgroundColor: theme.colors.accent, alignItems: "center" as const,
    justifyContent: "center" as const },
  initial: { ...type.title2, color: theme.colors.accentText }
});
