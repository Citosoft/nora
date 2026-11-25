import type { ButtonHTMLAttributes, Ref } from "react";
import type { LucideIcon } from "lucide-react";

/** A square icon tile in the app's pixel language; `active` fills it with the accent and marks a corner pixel. */
export interface PixelTileProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: LucideIcon;
  active: boolean;
  ref?: Ref<HTMLButtonElement>;
}
