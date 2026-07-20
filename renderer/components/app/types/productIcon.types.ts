import type { ImgHTMLAttributes } from "react";

export type ProductIconProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "onError" | "src"> & {
  sourceUrl: string | null | undefined;
  onFinalError?: () => void;
};

export type ProductIconSources = {
  localUrl: string | null;
  remoteUrl: string;
};
