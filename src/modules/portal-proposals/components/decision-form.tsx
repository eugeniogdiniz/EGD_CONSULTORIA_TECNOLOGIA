"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/shell/field-error";
import type { ActionResult } from "@/lib/action-result";
import { decideProposalForm } from "@/modules/portal-proposals/form-actions";

/** Aceitar (nome + confirmação) ou recusar (motivo). Uma decisão só. */
export function ProposalDecisionForm({ proposalId, defaultName }: { proposalId: string; defaultName: string }) {
  const [mode, setMode] = useState<"accepted" | "rejected">("accepted");
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(decideProposalForm, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="grid gap-4" data-testid="decisao-proposta">
      <input type="hidden" name="id" value={proposalId} />
      <input type="hidden" name="decision" value={mode} />
      <div role="group" aria-label="Decisão" className="inline-flex overflow-hidden rounded-sm border border-input">
        {([["accepted", "Aceitar a proposta"], ["rejected", "Recusar"]] as const).map(([k, l]) => (
          <button key={k} type="button" aria-pressed={mode === k} onClick={() => setMode(k)} className={`px-3 py-1.5 text-sm ${mode === k ? "bg-link-soft font-medium text-link" : "text-muted-foreground hover:bg-muted"}`}>
            {l}
          </button>
        ))}
      </div>
      {mode === "accepted" ? (
        <>
          <div className="grid gap-1.5">
            <Label htmlFor="dec-name">Seu nome completo</Label>
            <Input id="dec-name" name="name" defaultValue={defaultName} required aria-invalid={fe?.name ? true : undefined} />
            <FieldError errors={fe?.name} />
          </div>
          <label className="inline-flex items-start gap-2 text-sm">
            <input type="checkbox" name="agree" className="mt-0.5" required />
            <span>Li a proposta em anexo e aceito em nome da minha organização. O aceite registra concordância comercial e autoriza a preparação do contrato.</span>
          </label>
          <FieldError errors={fe?.agree} />
          <div className="grid gap-1.5">
            <Label htmlFor="dec-notes">Observações <span className="font-normal text-faint">opcional</span></Label>
            <Textarea id="dec-notes" name="notes" rows={2} />
          </div>
        </>
      ) : (
        <div className="grid gap-1.5">
          <Label htmlFor="dec-reason">Motivo da recusa</Label>
          <Textarea id="dec-reason" name="notes" rows={3} required aria-invalid={fe?.notes ? true : undefined} />
          <FieldError errors={fe?.notes} />
        </div>
      )}
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <div>
        <Button type="submit" variant={mode === "accepted" ? "default" : "destructive"} disabled={pending}>
          {pending ? "Registrando…" : mode === "accepted" ? "Confirmar aceite" : "Confirmar recusa"}
        </Button>
      </div>
    </form>
  );
}
