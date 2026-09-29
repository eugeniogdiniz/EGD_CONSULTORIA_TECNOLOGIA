"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  createDependencyForm,
  deleteDependencyForm,
} from "@/modules/projects/form-actions";
import { formatIsoDate } from "@/lib/format";
import type { ActionResult } from "@/lib/action-result";

type Option = { id: string; title: string; status: string; dueAt: string | null };
type Row = { id: string; title: string; status: string; dueAt: string | null };

const STATUS_DOT: Record<string, string> = {
  todo: "bg-faint",
  doing: "bg-link",
  review: "bg-accent",
  done: "bg-success",
  blocked: "bg-danger",
};

export function DependencyPicker({
  projectId,
  projectHref,
  deliverableId,
  predecessors,
  successors,
  candidates,
}: {
  projectId: string;
  projectHref: string;
  deliverableId: string;
  predecessors: Row[];
  successors: Row[];
  candidates: Option[];
}) {
  const [pick, setPick] = useState("");
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    async (prev, fd) => {
      const r = await createDependencyForm(prev, fd);
      if (r?.ok) setPick("");
      return r;
    },
    null,
  );
  const err = state && !state.ok ? state.error : null;

  const takenIds = useMemo(() => new Set(predecessors.map((p) => p.id)), [predecessors]);
  const availableCandidates = candidates.filter(
    (c) => c.id !== deliverableId && !takenIds.has(c.id),
  );

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="mb-2 text-sm font-medium">Depende de</h3>
        {predecessors.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem dependências.</p>
        ) : (
          <ul className="grid gap-2">
            {predecessors.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-sm border border-border bg-card px-3 py-2 text-sm">
                <span className={"inline-block h-1.5 w-1.5 rounded-full " + (STATUS_DOT[p.status] ?? "bg-faint")} />
                <Link href={`${projectHref}/entregas/${p.id}`} className="flex-1 truncate font-medium hover:text-link">
                  {p.title}
                </Link>
                <span className="type-data text-xs text-muted-foreground">{formatIsoDate(p.dueAt)}</span>
                <form action={deleteDependencyForm}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="predecessorId" value={p.id} />
                  <input type="hidden" name="successorId" value={deliverableId} />
                  <button type="submit" className="text-muted-foreground hover:text-danger" aria-label="Remover dependência">
                    ×
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={formAction} className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="successorId" value={deliverableId} />
          <select
            name="predecessorId"
            aria-label="Entrega predecessora"
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            className="h-9 rounded-sm border border-input bg-card px-2 text-sm"
          >
            <option value="">— selecione uma entrega predecessora —</option>
            {availableCandidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" disabled={pending || pick === ""}>
            {pending ? "…" : "Adicionar"}
          </Button>
        </form>
        {err && <p role="alert" className="mt-1 text-xs text-danger">{err}</p>}
      </div>

      {successors.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium">É pré-requisito de</h3>
          <ul className="grid gap-1.5">
            {successors.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-sm border border-dashed border-border bg-subtle px-3 py-2 text-sm">
                <span className={"inline-block h-1.5 w-1.5 rounded-full " + (STATUS_DOT[s.status] ?? "bg-faint")} />
                <Link href={`${projectHref}/entregas/${s.id}`} className="flex-1 truncate hover:text-link">
                  {s.title}
                </Link>
                <span className="type-data text-xs text-muted-foreground">{formatIsoDate(s.dueAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
