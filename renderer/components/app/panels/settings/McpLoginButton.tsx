import { LoaderCircle } from "lucide-react";
import type { McpLoginButtonProps } from "@/components/app/types/runtimeMcp.types";
import { Button } from "@/components/ui/button";

/** Starts a server's runtime sign-in, then shows it waiting on the browser or why it failed (offering a retry). */
export function McpLoginButton({ server, source, logins, compact = false }: McpLoginButtonProps) {
  const login = logins.state(source, server.name);
  const size = compact ? "h-6 px-2 text-[10px]" : "";
  if (login?.status === "pending") {
    return <span role="status" className={`inline-flex shrink-0 items-center gap-1 text-muted-foreground ${compact ? "text-[10px]" : "text-xs"}`}>
      <LoaderCircle className="size-3 motion-safe:animate-spin" aria-hidden="true" />Finish in browser…
    </span>;
  }
  return <Button variant="outline" size="sm" className={`shrink-0 ${size}`} title={login?.message} onClick={() => logins.start(source, server.name)}
    aria-label={`${login ? "Retry sign-in to" : "Sign in to"} ${server.name}`}>{login ? "Retry sign-in" : "Sign in"}</Button>;
}
