import { PaperclipIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/format";

export type AttachmentRow = { fileId: string; messageId: string | null; name: string; sizeBytes: number; mimeType: string };

/**
 * Anexos de uma mensagem. No admin o download é um link GET; no portal é um
 * formulário POST para /portal/arquivos/baixar (checa a organização ativa).
 */
export function AttachmentList({ items, area }: { items: AttachmentRow[]; area: "admin" | "portal" }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2" aria-label="Anexos">
      {items.map((a) => (
        <li key={a.fileId} className="inline-flex items-center gap-2 rounded-sm border border-border bg-subtle py-1 pr-1 pl-2 text-xs">
          <PaperclipIcon className="size-3.5 text-faint" aria-hidden />
          <span className="max-w-[16rem] truncate font-medium" title={a.name}>{a.name}</span>
          <span className="type-data text-faint">{formatBytes(a.sizeBytes)}</span>
          {area === "admin" ? (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" render={<a href={`/admin/arquivos/${a.fileId}/baixar`} />}>
              Baixar
            </Button>
          ) : (
            <form action="/portal/arquivos/baixar" method="post" className="contents">
              <input type="hidden" name="fileId" value={a.fileId} />
              <Button type="submit" variant="ghost" size="sm" className="h-6 px-2 text-xs">Baixar</Button>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}
