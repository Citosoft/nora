import type { ConnectionNotice } from "@/types/connectionNotice.types";
import type { RuntimeSessionSnapshot } from "@/types/runtimeSession.types";

/** What (if anything) to tell the user about the connection to a runtime; never implies agents run while it is unreachable. */
export function connectionNotice(snapshot: RuntimeSessionSnapshot, runtimeName: string): ConnectionNotice | null {
  const info = snapshot.info;
  if (info.status === "error") {
    return { tone: "danger", title: `Can't reach ${runtimeName}`, message: `${info.message} Nothing can run there until it's back online.`, action: "retry" };
  }
  if (snapshot.compatibility && !snapshot.compatibility.compatible) {
    return { tone: "attention", title: "Version mismatch", message: snapshot.compatibility.message, action: null };
  }
  if (info.status === "loading") return null;
  if (!snapshot.liveUpdates) {
    return { tone: "neutral", title: "Live updates unavailable", message: "This computer's Nora doesn't stream updates yet. Pull down to refresh.", action: null };
  }
  const connection = snapshot.connection;
  switch (connection.kind) {
    case "waiting":
      return { tone: "attention", title: "Reconnecting…", message: `${connection.reason}. Retrying automatically.`, action: "reconnect" };
    case "connecting":
      return connection.attempt > 0 ? { tone: "attention", title: "Reconnecting…", message: null, action: null } : null;
    case "catching-up":
      return { tone: "neutral", title: "Catching up on what you missed…", message: null, action: null };
    case "stopped":
      return connection.reason === "stopped" ? null : { tone: "danger", title: "Disconnected", message: connection.message, action: "retry" };
    case "idle":
    case "live":
      return null;
  }
}
