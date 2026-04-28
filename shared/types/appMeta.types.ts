export type PackageJsonAppMeta = {
  name?: string;
  productName?: string;
  displayName?: string;
  description?: string;
  version?: string;
  repository?: string | {
    type?: string;
    url?: string;
  };
};
