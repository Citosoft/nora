/** Outcome of checking a request's Origin header against the allowlist. */
export type CorsDecision =
  | { readonly kind: "no-origin" }
  | { readonly kind: "allowed"; readonly origin: string }
  | { readonly kind: "denied" };
