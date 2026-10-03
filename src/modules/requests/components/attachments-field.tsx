"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shell/field-error";
import { formatBytes } from "@/lib/format";
import { ALLOWED_EXTENSIONS, MAX_FILES } from "@/modules/requests/attachments";

/** Campo múltiplo de anexos com a lista do que foi escolhido antes de enviar. */
export function AttachmentsField({ id, errors, compact = false }: { id: string; errors?: string[]; compact?: boolean }) {
  const [chosen, setChosen] = useState<{ name: string; size: number }[]>([]);
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className={compact ? "sr-only" : undefined}>
        Anexos <span className="font-normal text-faint">opcional</span>
      </Label>
      <Input
        id={id}
        name="files"
        type="file"
        multiple
        accept={ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",")}
        aria-describedby={`${id}-hint`}
        aria-invalid={errors ? true : undefined}
        className="h-auto py-1.5 file:mr-3 file:rounded-sm file:border-0 file:bg-subtle file:px-2 file:py-1 file:text-xs file:font-medium"
        onChange={(e) => setChosen(Array.from(e.target.files ?? []).map((f) => ({ name: f.name, size: f.size })))}
      />
      <span id={`${id}-hint`} className="type-micro text-faint">
        Até {MAX_FILES} arquivos, 50 MB no total. PDF, Office, imagens, CSV, TXT ou ZIP.
      </span>
      {chosen.length > 0 && (
        <ul className="type-micro flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground" aria-label="Arquivos escolhidos">
          {chosen.map((f) => (
            <li key={f.name}>
              {f.name} <span className="text-faint">({formatBytes(f.size)})</span>
            </li>
          ))}
        </ul>
      )}
      <FieldError errors={errors} />
    </div>
  );
}
