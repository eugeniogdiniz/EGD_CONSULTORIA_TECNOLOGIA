"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shell/field-error";
import type { ActionResult } from "@/lib/action-result";
import { createApiKeyForm } from "@/modules/api-keys/form-actions";
import { SCOPES, SCOPE_LABEL } from "@/modules/api-keys/keys";

export function ApiKeyForm() {
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string; key: string }> | null, FormData>(
    createApiKeyForm,
    null,
  );
  const [copied, setCopied] = useState(false);
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <div className="grid gap-4">
      {state?.ok && (
        <div role="status" className="grid gap-2 rounded-md border border-success bg-success-soft p-4 text-sm">
          <strong>Chave criada. Copie agora: ela não será exibida de novo.</strong>
          <div className="flex items-center gap-2">
            <code className="type-data min-w-0 flex-1 break-all rounded-sm border border-border bg-card px-2 py-1.5 text-xs">
              {state.data.key}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(state.data.key);
                setCopied(true);
              }}
            >
              {copied ? "Copiada" : "Copiar"}
            </Button>
          </div>
        </div>
      )}
      <form action={formAction} className="grid max-w-xl gap-4" key={state?.ok ? state.data.id : "new"}>
        <div className="grid gap-1.5">
          <Label htmlFor="k-name">Nome</Label>
          <Input id="k-name" name="name" placeholder="Ex.: Integração do CRM parceiro" required aria-invalid={fe?.name ? true : undefined} />
          <FieldError errors={fe?.name} />
        </div>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Escopos</legend>
          {SCOPES.map((s) => (
            <label key={s} className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="scopes" value={s} />
              <span>
                {SCOPE_LABEL[s]} <code className="type-data text-xs text-muted-foreground">{s}</code>
              </span>
            </label>
          ))}
          <FieldError errors={fe?.scopes} />
        </fieldset>
        {state && !state.ok && !fe && (
          <p role="alert" className="text-sm text-danger">{state.error}</p>
        )}
        <div>
          <Button type="submit" size="sm" disabled={pending} onClick={() => setCopied(false)}>
            {pending ? "Criando…" : "Criar chave"}
          </Button>
        </div>
      </form>
    </div>
  );
}
