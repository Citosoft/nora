import type { VaultSecretRowProps } from "@/components/app/types/secretVault.types";
import { Button } from "@/components/ui/button";

const CELL_CLASS_NAME = "px-3 py-2 align-middle";

/** One saved secret: what it is called, what it is for and where it applies. Its value is never loaded into the window. */
export function VaultSecretRow({ secret, scopeLabel, onReplace, onDelete }: VaultSecretRowProps) {
  return <tr className="border-b border-border/40 last:border-0">
    <th scope="row" className={`${CELL_CLASS_NAME} break-all text-left font-mono text-xs font-medium`}>{secret.name}</th>
    <td className={`${CELL_CLASS_NAME} break-words text-muted-foreground`}>{secret.purpose || "—"}</td>
    <td className={`${CELL_CLASS_NAME} text-muted-foreground`}>{scopeLabel}</td>
    <td className={`${CELL_CLASS_NAME} whitespace-nowrap text-muted-foreground`}><time dateTime={secret.updatedAt}>{new Date(secret.updatedAt).toLocaleDateString()}</time></td>
    <td className={`${CELL_CLASS_NAME} whitespace-nowrap text-right`}>
      <Button variant="ghost" size="sm" aria-label={`Replace the value of ${secret.name}`} onClick={() => onReplace(secret)}>Replace value</Button>
      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" aria-label={`Delete ${secret.name}`} onClick={() => onDelete(secret)}>Delete</Button>
    </td>
  </tr>;
}
