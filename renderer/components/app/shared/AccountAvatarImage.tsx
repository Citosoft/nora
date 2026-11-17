import { useState } from "react";
import { useAccount } from "@/components/app/hooks/useAccount";
import type { AccountAvatarImageProps } from "@/components/app/types/accountAvatar.types";

/** The signed-in user's photo, filling its container; falls back when signed out or the image fails. */
export function AccountAvatarImage({ fallback }: AccountAvatarImageProps) {
  const account = useAccount();
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const imageUrl = account.status === "signed-in" ? account.user.imageUrl : null;
  if (!imageUrl || failedImage === imageUrl) return <>{fallback}</>;
  return <img src={imageUrl} alt="" referrerPolicy="no-referrer" className="size-full object-cover" onError={() => setFailedImage(imageUrl)} />;
}
