import { ForgeProviderIcon } from "@/components/app/views/ForgeProviderIcon";
import type { IssueReferencePillProps } from "@/components/app/types/forge-items/issue.types";
import { ReferencePill } from "./ReferencePill";

export function IssueReferencePill({ reference }: IssueReferencePillProps) {
  return <ReferencePill icon={<ForgeProviderIcon provider={reference.provider} className="size-3.5" />} title={reference.webUrl}>
    <span className="sr-only">{reference.provider === "gitlab" ? "GitLab" : "GitHub"} issue </span><span className="font-mono">#{reference.number}</span>
  </ReferencePill>;
}
