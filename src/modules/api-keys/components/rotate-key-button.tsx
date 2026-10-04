"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import { rotateApiKeyForm } from "@/modules/api-keys/form-actions";

type R = ActionResult<{ id: string; key: string; oldRevokesAt: Date }> | null;

/** Rotaciona a chave e mostra a nova uma única vez; a antiga continua válida por 7 dias. */
/** `disabled` depois da rotação: o componente continua montado para a nova chave não sumir da tela. */
export function RotateKeyButton({ id, name, disabled = false }: { id: string; name: string; disabled?: boolean }) {
  const [state, formAction, pending] = useActionState<R, FormData>(rotateApiKeyForm, null);
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-2">
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        <Button type="submit" size="sm" variant="outline" disabled={pending || disabled} aria-label={`Rotacionar ${name}`}>{pending ? "Rotacionando…" : disabled ? "Rotacionada" : "Rotacionar"}</Button>
      </form>
      {state && !state.ok && <p role="alert" className="type-micro text-danger">{state.error}</p>}
      {state?.ok && (
        <div role="status" className="grid gap-1 rounded-md border border-success bg-success-soft p-3 text-xs">
          <strong>Nova chave (copie agora):</strong>
          <div className="flex items-center gap-2">
            <code className="type-data min-w-0 flex-1 break-all rounded-sm border border-border bg-card px-2 py-1">{state.data.key}</code>
            <Button type="button" size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(state.data.key); setCopied(true); }}>{copied ? "Copiada" : "Copiar"}</Button>
          </div>
          <span className="text-muted-foreground">A chave antiga continua válida até {new Date(state.data.oldRevokesAt).toLocaleDateString("pt-BR")}.</span>
        </div>
      )}
    </div>
  );
}
