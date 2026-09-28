"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  startTimerForm,
  stopTimerForm,
} from "@/modules/projects/form-actions";
import type { ActionResult } from "@/lib/action-result";

type OpenTimer = {
  id: string;
  deliverableId: string;
  deliverableTitle: string;
  startedAt: Date | string;
} | null;

/** Renderiza contador HH:MM:SS a partir de startedAt. Interpolado no client. */
function Clock({ startedAt }: { startedAt: Date }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsedMs = Math.max(0, now - startedAt.getTime());
  const s = Math.floor(elapsedMs / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return (
    <span className="type-data text-2xl font-medium text-link tabular-nums">
      {hh}:{mm}:{ss}
    </span>
  );
}

export function TimerPanel({
  projectId,
  deliverableId,
  deliverableTitle,
  openTimer,
}: {
  projectId: string;
  deliverableId: string;
  deliverableTitle: string;
  openTimer: OpenTimer;
}) {
  const [notes, setNotes] = useState("");
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    async (prev, fd) => startTimerForm(prev, fd),
    null,
  );
  const err = state && !state.ok ? state.error : null;

  const startedAt = openTimer ? (openTimer.startedAt instanceof Date ? openTimer.startedAt : new Date(openTimer.startedAt)) : null;
  const runningHere = openTimer && openTimer.deliverableId === deliverableId;
  const runningElsewhere = openTimer && !runningHere;

  if (runningHere) {
    return (
      <div className="flex items-center gap-4 rounded-md border border-link bg-link-soft p-4">
        <Clock startedAt={startedAt!} />
        <div className="flex-1 text-sm">
          <div className="font-medium">Registrando tempo</div>
          <div className="type-micro text-muted-foreground">
            para <strong>{deliverableTitle}</strong>
          </div>
        </div>
        <form action={stopTimerForm}>
          <input type="hidden" name="entryId" value={openTimer!.id} />
          <input type="hidden" name="projectId" value={projectId} />
          <Button type="submit" variant="secondary" size="sm">Parar timer</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4">
      {runningElsewhere && (
        <div className="rounded-sm border border-warning bg-warning-soft px-3 py-2 text-xs text-warning">
          Você tem um timer aberto em <strong>{openTimer!.deliverableTitle}</strong>. Iniciar aqui vai fechá-lo automaticamente.
        </div>
      )}
      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="deliverableId" value={deliverableId} />
        <input type="hidden" name="projectId" value={projectId} />
        <Input
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas (opcional)"
          className="min-w-0 flex-1"
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Iniciando…" : "Iniciar timer"}
        </Button>
      </form>
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
    </div>
  );
}

export function ManualTimeForm({ projectId, deliverableId }: { projectId: string; deliverableId: string }) {
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    async (prev, fd) => {
      const { logManualTimeForm } = await import("@/modules/projects/form-actions");
      return logManualTimeForm(prev, fd);
    },
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="grid gap-3 rounded-md border border-dashed border-border bg-subtle p-4 text-sm">
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <input type="hidden" name="projectId" value={projectId} />
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-muted-foreground">
          Início
          <Input name="startedAt" type="datetime-local" required aria-invalid={fe?.startedAt ? true : undefined} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Fim
          <Input name="endedAt" type="datetime-local" required aria-invalid={fe?.endedAt ? true : undefined} />
        </label>
      </div>
      <label className="grid gap-1 text-xs text-muted-foreground">
        Notas (opcional)
        <Input name="notes" placeholder="O que foi feito?" />
      </label>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-danger">
          {fe?.startedAt?.[0] ?? fe?.endedAt?.[0] ?? state.error}
        </p>
      )}
      <div>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Registrando…" : "Registrar entrada manual"}
        </Button>
      </div>
    </form>
  );
}
