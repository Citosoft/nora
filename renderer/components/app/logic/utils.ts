export function formatAgentMode(mode: "read" | "write"): string {
  return mode === "read" ? "Read-only" : "Writable";
}

export function formatTimestamp(timestamp: string | null | undefined): string {
  if (!timestamp) {
    return "Unknown";
  }

  const value = new Date(timestamp);
  if (Number.isNaN(value.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

export function statusVariant(status: string): "success" | "warning" | "destructive" | "secondary" | "default" {
  if (status === "running" || status === "available" || status === "installed") {
    return "success";
  }
  if (status === "idle" || status === "stopped") {
    return "warning";
  }
  if (status === "error" || status === "missing") {
    return "destructive";
  }
  return "secondary";
}
