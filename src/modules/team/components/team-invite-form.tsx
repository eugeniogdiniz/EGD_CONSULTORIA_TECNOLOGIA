"use client";

import { useActionState, useEffect, useRef } from "react";
import { inviteTeamMemberForm } from "@/modules/team/form-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shell/field-error";
import type { ActionResult } from "@/lib/action-result";

type State = ActionResult<{ invitationId: string }> | null;

export function TeamInviteForm() {
  const [state, action, pending] = useActionState<State, FormData>(inviteTeamMemberForm, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form ref={ref} action={action} className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
      <div className="grid gap-1.5">
        <Label htmlFor="team-email">E-mail</Label>
        <Input id="team-email" name="email" type="email" placeholder="nome@egdsystem.com.br" required aria-invalid={fe?.email ? true : undefined} />
        <FieldError errors={fe?.email} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="team-role">Papel</Label>
        <select id="team-role" name="role" defaultValue="collaborator" className="h-9 rounded-sm border border-input bg-card px-3 text-sm">
          <option value="collaborator">Colaborador</option>
          <option value="admin">Administrador</option>
        </select>
      </div>
      <div>
        <Button type="submit" disabled={pending}>{pending ? "Convidando…" : "Convidar"}</Button>
      </div>
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger md:col-span-3">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm text-success md:col-span-3">Convite enviado.</p>}
      <p className="type-micro text-faint md:col-span-3">
        Colaborador vê projetos, demandas, atas, solicitações e o relatório semanal; não vê CRM, valores, chaves, automações nem auditoria. O convite vale por 7 dias.
      </p>
    </form>
  );
}
