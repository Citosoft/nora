import { ChevronDown } from "lucide-react";
import type { ProviderSignInButtonProps } from "@/components/app/types/providerAccount.types";
import { Button } from "@/components/ui/button";
import { PopoverMenu, PopoverMenuItem } from "@/components/ui/popover-menu";

/** A single sign-in starts the runtime's default flow; several open a menu so the user picks how to connect. */
export function ProviderSignInButton({ providerLabel, label, loginMethods, onSignIn }: ProviderSignInButtonProps) {
  if (loginMethods.length < 2) {
    return <Button variant="outline" size="sm" onClick={() => onSignIn(loginMethods[0]?.id)}>{label}</Button>;
  }
  const menuLabel = `${label} to ${providerLabel}`;
  return (
    <PopoverMenu label={menuLabel} widthClassName="w-72" trigger={
      <Button variant="outline" size="sm" aria-label={menuLabel}>
        {label}<ChevronDown className="size-3.5" aria-hidden="true" />
      </Button>}>
      {loginMethods.map((method) => (
        <PopoverMenuItem key={method.id} className="flex-col items-start gap-0.5 py-2" onSelect={() => onSignIn(method.id)}>
          <span className="font-medium text-foreground">{method.label}</span>
          {method.description ? <span className="text-xs text-muted-foreground">{method.description}</span> : null}
        </PopoverMenuItem>
      ))}
    </PopoverMenu>
  );
}
