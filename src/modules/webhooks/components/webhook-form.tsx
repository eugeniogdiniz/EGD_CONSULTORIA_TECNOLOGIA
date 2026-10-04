"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shell/field-error";
import type { ActionResult } from "@/lib/action-result";
import { createWebhookForm, testWebhookForm } from "@/modules/webhooks/form-actions";
import { EVENT_LABEL, WEBHOOK_EVENTS } from "@/modules/webhooks/sign";

const SUBSCRIBABLE = WEBHOOK_EVENTS.filter((e) => e !== "ping");

export function WebhookForm() {
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string; secret: string }> | null, FormData>(createWebhookForm, null);
  const [copied, setCopied] = useState(false);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <div className="grid gap-4">
      {state?.ok && (
        <div role="status" className="grid gap-2 rounded-md border border-success bg-success-soft p-4 text-sm">
          <strong>Webhook criado. Copie o segredo agora: ele não será exibido de novo.</strong>
          <div className="flex items-center gap-2">
            <code className="type-data min-w-0 flex-1 break-all rounded-sm border border-border bg-card px-2 py-1.5 text-xs">{state.data.secret}</code>
            <Button type="button" size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(state.data.secret); setCopied(true); }}>{copied ? "Copiado" : "Copiar"}</Button>
          </div>
        </div>
      )}
      <form action={formAction} className="grid max-w-xl gap-4" key={state?.ok ? state.data.id : "new"}>
        <div className="grid gap-1.5">
          <Label htmlFor="wh-name">Nome do webhook</Label>
          <Input id="wh-name" name="name" placeholder="Ex.: Planilha de leads no n8n" required aria-invalid={fe?.name ? true : undefined} />
          <FieldError errors={fe?.name} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="wh-url">URL de destino</Label>
          <Input id="wh-url" name="url" type="url" placeholder="https://…" required aria-invalid={fe?.url ? true : undefined} />
          <FieldError errors={fe?.url} />
        </div>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Eventos</legend>
          {SUBSCRIBABLE.map((e) => (
            <label key={e} className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="events" value={e} />
              <span>{EVENT_LABEL[e]} <code className="type-data text-xs text-muted-foreground">{e}</code></span>
            </label>
          ))}
          <FieldError errors={fe?.events} />
        </fieldset>
        {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
        <div>
          <Button type="submit" size="sm" disabled={pending} onClick={() => setCopied(false)}>{pending ? "Criando…" : "Criar webhook"}</Button>
        </div>
      </form>
    </div>
  );
}

export function TestWebhookButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState<ActionResult<{ ok: boolean; status: number | null; error: string | null }> | null, FormData>(testWebhookForm, null);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>{pending ? "Testando…" : "Testar"}</Button>
      {state && (
        <span role="status" className={`type-micro ${state.ok && state.data.ok ? "text-success" : "text-danger"}`}>
          {state.ok ? (state.data.ok ? `ok (${state.data.status})` : `falhou (${state.data.error ?? state.data.status})`) : state.error}
        </span>
      )}
    </form>
  );
}
