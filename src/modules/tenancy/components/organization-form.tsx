"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shell/field-error";
import type { ActionResult } from "@/lib/action-result";

export function OrganizationForm<T>({
  action,
  initial,
}: {
  action: (prev: ActionResult<T> | null, fd: FormData) => Promise<ActionResult<T> | null>;
  initial?: { id: string; name: string; cnpj: string | null; slug: string };
}) {
  const [state, formAction, pending] = useActionState<ActionResult<T> | null, FormData>(action, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="grid max-w-lg gap-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" defaultValue={initial?.name} required aria-invalid={fe?.name ? true : undefined} />
        <FieldError errors={fe?.name} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="cnpj">
          CNPJ <span className="font-normal text-faint">opcional</span>
        </Label>
        <Input id="cnpj" name="cnpj" defaultValue={initial?.cnpj ?? ""} inputMode="numeric" aria-invalid={fe?.cnpj ? true : undefined} />
        <FieldError errors={fe?.cnpj} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="slug">
          Identificador <span className="font-normal text-faint">opcional, gerado do nome</span>
        </Label>
        <Input id="slug" name="slug" defaultValue={initial?.slug} className="font-mono" aria-invalid={fe?.slug ? true : undefined} />
        <FieldError errors={fe?.slug} />
      </div>
      {state && !state.ok && !fe && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.ok && initial && (
        <p role="status" className="text-sm text-success">
          Dados salvos.
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
