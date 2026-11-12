import { McpServerTableRow } from "@/components/app/panels/settings/McpServerTableRow";
import type { McpServerTableProps } from "@/components/app/types/runtimeMcp.types";

const HEADER_CLASS_NAME = "px-3 py-2 font-medium text-muted-foreground";

export function McpServerTable({ rows, logins }: McpServerTableProps) {
  return <div className="overflow-x-auto rounded-md border border-border/60">
    <table className="w-full min-w-[640px] text-left text-sm">
      <thead className="border-b border-border/60 bg-muted/40 text-xs">
        <tr>
          <th scope="col" className={HEADER_CLASS_NAME}>Server</th>
          <th scope="col" className={HEADER_CLASS_NAME}>Provider</th>
          <th scope="col" className={HEADER_CLASS_NAME}>Scope</th>
          <th scope="col" className={HEADER_CLASS_NAME}>Status</th>
          <th scope="col" className={HEADER_CLASS_NAME}>Tools</th>
          <th scope="col" className={HEADER_CLASS_NAME}><span className="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ server, source }) => <McpServerTableRow key={`${source.key}:${server.name}`} server={server} source={source} logins={logins} />)}
      </tbody>
    </table>
  </div>;
}
