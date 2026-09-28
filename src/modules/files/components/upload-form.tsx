"use client";

import { useActionState, useEffect, useRef } from "react";
import { uploadFileForm, type UploadState } from "@/modules/files/form-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shell/field-error";

export function UploadForm({ organizations }: { organizations: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<UploadState, FormData>(uploadFileForm, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form ref={ref} action={action} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
      <div className="grid gap-1.5">
        <Label htmlFor="file">Arquivo</Label>
        <Input id="file" name="file" type="file" required aria-invalid={fe?.file ? true : undefined} />
        <FieldError errors={fe?.file} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="organizationId">Organização</Label>
        <select
          id="organizationId"
          name="organizationId"
          className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-link-soft"
          defaultValue=""
        >
          <option value="">Interno (sem organização)</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando…" : "Enviar"}
        </Button>
      </div>
      {state && !state.ok && !fe && (
        <p role="alert" className="text-sm text-danger md:col-span-3">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-sm text-success md:col-span-3">
          Arquivo enviado.
        </p>
      )}
    </form>
  );
}
