import { useAppAccount } from "@/hooks/useAppAccount";
import { AccountAvatar } from "@/components/common/AccountAvatar";
import { ListRow } from "@/components/common/ListRow";
import { ListSection } from "@/components/common/ListSection";

/** The signed-in account as the Settings header row (photo, name, email). */
export function AccountSection() {
  const { user, status } = useAppAccount();
  const email = user?.email ?? null;
  const name = user?.fullName || email || "Signed in";
  return (
    <ListSection footer={status === "demo" ? "Sample account. All demo data stays in memory and resets when you leave demo mode." : "Every device signed in to this account can reach your computers. Nothing else is needed to pair."}>
      <ListRow title={name} subtitle={email && user?.fullName ? email : "Nora account"} leading={<AccountAvatar imageUrl={user?.imageUrl ?? null} name={name} size={52} />} />
    </ListSection>
  );
}
