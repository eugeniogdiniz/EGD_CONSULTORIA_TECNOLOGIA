"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import { setMeetingSharedForm } from "@/modules/meetings/form-actions";

export function ShareToggle({ meetingId, shared }: { meetingId: string; shared: boolean }) {
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(setMeetingSharedForm, null);
  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="id" value={meetingId} />
      <input type="hidden" name="shared" value={shared ? "0" : "1"} />
      <p className="text-sm text-muted-foreground">
        {shared
          ? "O cliente lê esta ata no portal, sem poder editar. Itens de ação só aparecem se a entrega for visível ao cliente."
          : "Só a equipe vê esta ata."}
      </p>
      <div>
        <Button type="submit" size="sm" variant={shared ? "outline" : "secondary"} disabled={pending}>
          {shared ? "Deixar de compartilhar" : "Compartilhar com o cliente"}
        </Button>
      </div>
      {state && !state.ok && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}

export function PrintButton() {
  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
      Imprimir
    </Button>
  );
}
