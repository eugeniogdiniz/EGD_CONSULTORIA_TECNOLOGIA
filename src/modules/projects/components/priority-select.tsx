"use client";

import { useRef } from "react";
import { PRIORITIES, PRIORITY_LABEL, type Priority } from "@/modules/projects/priority";
import { setDeliverablePriorityForm } from "@/modules/projects/form-actions";

/** Troca a prioridade na própria linha da lista: o formulário é enviado ao escolher. */
export function PrioritySelect({ id, projectId, value }: { id: string; projectId: string; value: Priority }) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={setDeliverablePriorityForm}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="projectId" value={projectId} />
      <select
        name="priority"
        defaultValue={value}
        aria-label="Prioridade"
        onChange={() => form.current?.requestSubmit()}
        className="h-8 rounded-sm border border-input bg-card px-2 text-xs"
      >
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
        ))}
      </select>
    </form>
  );
}
