export type DirectoryRoute =
  | { readonly kind: "provision" }
  | { readonly kind: "list" }
  | { readonly kind: "rename"; readonly rawInstallationId: string }
  | { readonly kind: "delete"; readonly rawInstallationId: string }
  | { readonly kind: "rotate"; readonly rawInstallationId: string }
  | { readonly kind: "push-register" }
  | { readonly kind: "push-unregister"; readonly rawDeviceId: string }
  | { readonly kind: "push-send" };

export type RouteMatch =
  | { readonly kind: "matched"; readonly route: DirectoryRoute }
  | { readonly kind: "not-found" }
  | { readonly kind: "method-not-allowed"; readonly allow: readonly string[] };
