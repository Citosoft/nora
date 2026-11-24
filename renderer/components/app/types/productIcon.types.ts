import type { ImgHTMLAttributes } from "react";

export type ProductIconProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "onError" | "src"> & {
  sourceUrl: string | null | undefined;
  onFinalError?: () => void;
};

export type ProductIconSources = {
  localUrl: string | null;
  remoteUrl: string;
};

export interface ProductLogoProps {
  /** The product's domain; its bundled icon (renderer/product-icons) is used when present. */
  domain: string;
  className?: string;
  imgClassName?: string;
}
