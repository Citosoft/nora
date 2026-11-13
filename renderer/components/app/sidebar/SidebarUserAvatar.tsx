import { UserRound } from "lucide-react";
import { useUserDisplayName } from "@/components/app/hooks/useUserDisplayName";
import { useAccount } from "@/components/app/hooks/useAccount";
import { accountClient } from "@/components/app/clients/accountClient";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AccountAction } from "@shared/types/account/account.types";
import { SettingsSyncControls } from "./SettingsSyncControls";

export function SidebarUserAvatar() {
  const localName = useUserDisplayName();
  const account = useAccount();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const name = account.status === "signed-in" ? account.user.name : localName;
  const imageUrl = account.status === "signed-in" ? account.user.imageUrl : null;
  const initial = Array.from(name)[0]?.toLocaleUpperCase();
  const act = (action: AccountAction) => {
    setError(null); setOpen(false);
    void accountClient.open(action).catch(() => { setError("Account services could not open. Try again."); setOpen(true); });
  };
  return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild>
    <Button variant="ghost" size="icon" aria-label={account.status === "signed-in" ? `Account: ${name}` : "Your account"}
      onClick={(event) => { if (account.status === "signed-out") { event.preventDefault(); act("manage"); } }}
      tooltip={name || "Your account"} className="size-8 rounded-full">
      <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground">
        {imageUrl && failedImage !== imageUrl ? <img src={imageUrl} alt="" referrerPolicy="no-referrer" className="size-full object-cover" onError={() => setFailedImage(imageUrl)} />
          : initial || <UserRound className="size-3.5" aria-hidden="true" />}
      </span>
    </Button>
  </PopoverTrigger><PopoverContent side="top" className="w-64 space-y-3">
    {account.status === "signed-in" && <p className="truncate text-sm font-medium">{name}</p>}
    {account.status === "unconfigured" ? <p className="text-xs text-muted-foreground">Account sign-in is unavailable.</p>
      : <Button size="sm" className="w-full justify-start" variant="ghost" onClick={() => act("manage")}>
        {account.status === "signed-in" ? "Manage account" : "Sign in"}</Button>}
    {account.status === "signed-in" && <Button size="sm" className="w-full justify-start text-muted-foreground" variant="ghost" onClick={() => act("sign-out")}>Sign out</Button>}
    {account.status === "signed-in" && <SettingsSyncControls />}
    {(error || account.status === "error") && <p role="alert" className="text-xs text-destructive">{error || (account.status === "error" ? account.message : "")}</p>}
  </PopoverContent></Popover>;
}
