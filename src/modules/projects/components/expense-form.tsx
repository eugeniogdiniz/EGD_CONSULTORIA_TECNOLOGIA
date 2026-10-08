"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/shell/field-error";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createExpenseForm, deleteExpenseForm, updateExpenseForm } from "@/modules/projects/form-actions";
import { EXPENSE_KIND_OPTIONS, type ExpenseKind } from "@/modules/projects/payables";
import type { ActionResult } from "@/lib/action-result";

type Expense = {
  id: string;
  projectId: string | null;
  supplier: string | null;
  description: string;
  amountCents: number;
  kind: ExpenseKind;
  dueAt: string;
  dateAt: string;
  notes: string | null;
};

export type ProjectOption = { id: string; title: string; companyName?: string };

const selectClass = "h-10 rounded-sm border border-input bg-card px-3 text-sm [.theme-app_&]:h-9";

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

/**
 * Conta a pagar. Dentro de um projeto (`projectId`) o projeto fica fixo e o
 * diálogo se chama "despesa"; na tela consolidada (`projects`) o projeto é
 * opcional (vazio = custo geral da EGD).
 */
export function ExpenseFormDialog({
  projectId,
  projects,
  expense,
  trigger,
}: {
  projectId?: string;
  projects?: ProjectOption[];
  expense?: Expense;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(expense);
  const noun = projectId ? "despesa" : "conta a pagar";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Editar ${noun}` : `Nova ${noun}`}</DialogTitle>
        </DialogHeader>
        {isEdit ? (
          <EditForm projectId={projectId} projects={projects} expense={expense!} onDone={() => setOpen(false)} />
        ) : (
          <CreateForm projectId={projectId} projects={projects} onDone={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Fields({
  projectId,
  projects,
  expense,
  fe,
  reais,
  setReais,
}: {
  projectId?: string;
  projects?: ProjectOption[];
  expense?: Expense;
  fe: Record<string, string[]> | undefined;
  reais: string;
  setReais: (v: string) => void;
}) {
  return (
    <>
      {expense && <input type="hidden" name="id" value={expense.id} />}
      {projectId ? (
        <input type="hidden" name="projectId" value={projectId} />
      ) : (
        <div className="grid gap-1.5">
          <Label htmlFor="e-project">Projeto <span className="font-normal text-faint">vazio = custo geral da EGD</span></Label>
          <select id="e-project" name="projectId" defaultValue={expense?.projectId ?? ""} className={selectClass}>
            <option value="">Sem projeto (custo geral)</option>
            {(projects ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.title}{p.companyName ? ` · ${p.companyName}` : ""}</option>
            ))}
          </select>
          <FieldError errors={fe?.projectId} />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="e-desc">Descrição</Label>
          <Input id="e-desc" name="description" defaultValue={expense?.description} required aria-invalid={fe?.description ? true : undefined} />
          <FieldError errors={fe?.description} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="e-supplier">Fornecedor <span className="font-normal text-faint">opcional</span></Label>
          <Input id="e-supplier" name="supplier" defaultValue={expense?.supplier ?? ""} maxLength={200} aria-invalid={fe?.supplier ? true : undefined} />
          <FieldError errors={fe?.supplier} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
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
          <Label htmlFor="e-due">Vencimento</Label>
          <Input id="e-due" name="dueAt" type="date" defaultValue={expense?.dueAt ?? ""} required aria-invalid={fe?.dueAt ? true : undefined} />
          <FieldError errors={fe?.dueAt} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="e-date">Competência <span className="font-normal text-faint">opcional</span></Label>
          <Input id="e-date" name="dateAt" type="date" defaultValue={expense?.dateAt ?? ""} aria-invalid={fe?.dateAt ? true : undefined} />
          <FieldError errors={fe?.dateAt} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="e-kind">Tipo</Label>
        <select id="e-kind" name="kind" defaultValue={expense?.kind ?? "other"} className={selectClass}>
          {EXPENSE_KIND_OPTIONS.map((k) => (
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

function CreateForm({ projectId, projects, onDone }: { projectId?: string; projects?: ProjectOption[]; onDone: () => void }) {
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
      <Fields projectId={projectId} projects={projects} fe={fe} reais={reais} setReais={setReais} />
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Criando…" : "Criar"}</Button>
      </DialogFooter>
    </form>
  );
}

function EditForm({ projectId, projects, expense, onDone }: { projectId?: string; projects?: ProjectOption[]; expense: Expense; onDone: () => void }) {
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
      <Fields projectId={projectId} projects={projects} expense={expense} fe={fe} reais={reais} setReais={setReais} />
      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <DialogFooter>
        <form action={deleteExpenseForm} className="mr-auto">
          <input type="hidden" name="id" value={expense.id} />
          <input type="hidden" name="projectId" value={projectId ?? expense.projectId ?? ""} />
          <Button type="submit" size="sm" variant="destructive">Excluir</Button>
        </form>
        <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Fechar</DialogClose>
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</Button>
      </DialogFooter>
    </form>
  );
}
