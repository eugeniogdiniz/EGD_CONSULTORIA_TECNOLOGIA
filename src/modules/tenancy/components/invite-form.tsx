"use client";

import { useActionState, useEffect, useRef } from "react";
import { inviteUserForm } from "@/modules/tenancy/form-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shell/field-error";
import type { ActionResult } from "@/lib/action-result";

type State = ActionResult<{ invitationId: string }> | null;

export function InviteForm({ organizationId }: { organizationId: string }) {
  const [state, action, pending] = useActionState<State, FormData>(inviteUserForm, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form ref={ref} action={action} className="grid gap-3">
      <input type="hidden" name="organizationId" value={organizationId} />
      <div className="grid gap-1.5">
        <Label htmlFor="invite-email">E-mail</Label>
        <Input id="invite-email" name="email" type="email" placeholder="nome@empresa.com.br" required aria-invalid={fe?.email ? true : undefined} />
        <FieldError errors={fe?.email} />
      </div>
      {state && !state.ok && !fe && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-sm text-success">
          Convite enviado.
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Convidando…" : "Convidar"}
        </Button>
      </div>
      <p className="text-[0.8125rem] text-faint">A pessoa recebe um link para criar a senha. O convite vale por 7 dias.</p>
    </form>
  );
}
