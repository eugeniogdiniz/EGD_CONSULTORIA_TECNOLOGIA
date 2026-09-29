"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/shell/field-error";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  createExpenseForm,
  deleteExpenseForm,
  updateExpenseForm,
} from "@/modules/projects/form-actions";
import type { ActionResult } from "@/lib/action-result";

type Expense = {
  id: string;
  description: string;
  amountCents: number;
  kind: "travel" | "service" | "equipment" | "other";
  dateAt: string;
  notes: string | null;
};

const KIND_OPTIONS = [
  { value: "travel", label: "Viagem" },
  { value: "service", label: "Serviço" },
  { value: "equipment", label: "Equipamento" },
  { value: "other", label: "Outros" },
] as const;

function centsToReais(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function reaisInputToCents(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "") return "";
  const norm = trimmed.replace(/\./g, "").replace(",", ".");
  const parsed = Number(norm);
  if (!Number.isFinite(parsed) || parsed < 0) return raw;
  return String(Math.round(parsed * 100));
}

export function ExpenseFormDialog({
  projectId,
  expense,
  trigger,
}: {
  projectId: string;
  expense?: Expense;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(expense);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar despesa" : "Nova despesa"}</DialogTitle>
        </DialogHeader>
        {isEdit ? (
          <EditForm projectId={projectId} expense={expense!} onDone={() => setOpen(false)} />
        ) : (
          <CreateForm projectId={projectId} onDone={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Fields({
  projectId,
  expense,
  fe,
  reais,
  setReais,
}: {
  projectId: string;
  expense?: Expense;
  fe: Record<string, string[]> | undefined;
  reais: string;
  setReais: (v: string) => void;
}) {
  return (
    <>
      <input type="hidden" name="projectId" value={projectId} />
      {expense && <input type="hidden" name="id" value={expense.id} />}
      <div className="grid gap-1.5">
        <Label htmlFor="e-desc">Descrição</Label>
        <Input id="e-desc" name="description" defaultValue={expense?.description} required aria-invalid={fe?.description ? true : undefined} />
        <FieldError errors={fe?.description} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="e-amount">Valor (R$)</Label>
          <Input
            id="e-amount"
            inputMode="decimal"
            value={reais}
            onChange={(e) => setReais(e.target.value)}
            placeholder="0,00"
            aria-invalid={fe?.amountCents ? true : undefined}
          />
          <FieldError errors={fe?.amountCents} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="e-date">Data</Label>
          <Input id="e-date" name="dateAt" type="date" defaultValue={expense?.dateAt ?? ""} required aria-invalid={fe?.dateAt ? true : undefined} />
          <FieldError errors={fe?.dateAt} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="e-kind">Tipo</Label>
        <select
          id="e-kind"
          name="kind"
          defaultValue={expense?.kind ?? "other"}
          className="h-10 rounded-sm border border-input bg-card px-3 text-sm"
        >
          {KIND_OPTIONS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="e-notes">Notas <span className="font-normal text-faint">opcional</span></Label>
        <Textarea id="e-notes" name="notes" defaultValue={expense?.notes ?? ""} rows={3} />
      </div>
    </>
  );
}

function CreateForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [reais, setReais] = useState("");
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    async (prev, fd) => {
      fd.set("amountCents", reaisInputToCents(reais));
      const r = await createExpenseForm(prev, fd);
      if (r?.ok) onDone();
      return r;
    },
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="grid gap-4">
      <Fields projectId={projectId} fe={fe} reais={reais} setReais={setReais} />
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Criando…" : "Criar"}</Button>
      </DialogFooter>
    </form>
  );
}

function EditForm({ projectId, expense, onDone }: { projectId: string; expense: Expense; onDone: () => void }) {
  const [reais, setReais] = useState(centsToReais(expense.amountCents));
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    async (prev, fd) => {
      fd.set("amountCents", reaisInputToCents(reais));
      const r = await updateExpenseForm(prev, fd);
      if (r?.ok) onDone();
      return r;
    },
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="grid gap-4">
      <Fields projectId={projectId} expense={expense} fe={fe} reais={reais} setReais={setReais} />
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <DialogFooter>
        <form action={deleteExpenseForm} className="mr-auto">
          <input type="hidden" name="id" value={expense.id} />
          <input type="hidden" name="projectId" value={projectId} />
          <Button type="submit" size="sm" variant="destructive">Excluir</Button>
        </form>
        <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Fechar</DialogClose>
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</Button>
      </DialogFooter>
    </form>
  );
}
