import { BotAvatarStack } from "@/components/app/shared/BotAvatarStack";
import { memberList } from "@/components/app/logic/botThreads";
import type { NativeGroupGreetingProps } from "@/components/app/types/nativePanels.types";

export function NativeGroupGreeting({ members, workspaceName }: NativeGroupGreetingProps) {
  const names = memberList(members.map((member) => member.name));
  return <div className="flex flex-col items-center gap-3">
    <BotAvatarStack members={members} size={64} label={`Group: ${names}`} />
    <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">What should <span className="text-primary">{names}</span> work on in <span className="text-primary">{workspaceName}</span>?</h1>
    <p className="text-sm text-muted-foreground">@mention who should answer, or Nora picks. Each member replies in turn from its own thread.</p>
  </div>;
}
