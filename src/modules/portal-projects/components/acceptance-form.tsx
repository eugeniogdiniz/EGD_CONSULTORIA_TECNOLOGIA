"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/shell/field-error";
import type { ActionResult } from "@/lib/action-result";
import { decideDeliverableForm } from "@/modules/portal-projects/form-actions";

/** Aprovar a entrega concluída ou pedir ajustes (com motivo). */
export function AcceptanceForm({ projectId, deliverableId }: { projectId: string; deliverableId: string }) {
  const [mode, setMode] = useState<"approved" | "changes_requested">("approved");
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(decideDeliverableForm, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="grid gap-3" data-testid="aprovacao-entrega">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <input type="hidden" name="decision" value={mode} />
      <div role="group" aria-label="Decisão" className="inline-flex overflow-hidden rounded-sm border border-input">
        {([["approved", "Aprovar entrega"], ["changes_requested", "Pedir ajustes"]] as const).map(([k, l]) => (
          <button key={k} type="button" aria-pressed={mode === k} onClick={() => setMode(k)} className={`px-3 py-1.5 text-sm ${mode === k ? "bg-link-soft font-medium text-link" : "text-muted-foreground hover:bg-muted"}`}>
            {l}
          </button>
        ))}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="acc-notes">{mode === "approved" ? "Observações" : "O que precisa ser ajustado"} {mode === "approved" && <span className="font-normal text-faint">opcional</span>}</Label>
        <Textarea id="acc-notes" name="notes" rows={3} required={mode === "changes_requested"} aria-invalid={fe?.notes ? true : undefined} />
        <FieldError errors={fe?.notes} />
      </div>
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <div>
        <Button type="submit" variant={mode === "approved" ? "default" : "outline"} disabled={pending}>
          {pending ? "Registrando…" : mode === "approved" ? "Confirmar aprovação" : "Enviar pedido de ajustes"}
        </Button>
      </div>
    </form>
  );
}
