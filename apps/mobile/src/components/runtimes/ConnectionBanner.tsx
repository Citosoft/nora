import type { RuntimeSession, RuntimeSessionSnapshot } from "@/types/runtimeSession.types";
import { connectionNotice } from "@/state/connectionNotice";
import { Banner } from "@/components/common/Banner";
import { Button } from "@/components/common/Button";
import { Inset } from "@/components/common/Inset";

/** The runtime's connection problem, if any, aligned with the screen's content; renders nothing while connected. */
export function ConnectionBanner({ session, snapshot, runtimeName }: { session: RuntimeSession; snapshot: RuntimeSessionSnapshot; runtimeName: string }) {
  const notice = connectionNotice(snapshot, runtimeName);
  if (!notice) return null;
  const action = notice.action === "retry" ? <Button label="Try again" compact onPress={() => session.retry()} />
    : notice.action === "reconnect" ? <Button label="Reconnect now" compact onPress={() => session.resume()} /> : null;
  return <Inset><Banner tone={notice.tone} title={notice.title} message={notice.message} action={action} /></Inset>;
}
