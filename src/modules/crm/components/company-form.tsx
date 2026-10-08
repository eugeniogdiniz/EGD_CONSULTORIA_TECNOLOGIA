"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/shell/field-error";
import type { ActionResult } from "@/lib/action-result";

const SOURCE_OPTIONS = [
  { value: "outbound", label: "Prospecção ativa" },
  { value: "site_contact", label: "Contato pelo site" },
  { value: "referral", label: "Indicação" },
  { value: "event", label: "Evento" },
  { value: "other", label: "Outra" },
] as const;

export function CompanyForm<T>({
  action,
  initial,
  submitLabel = "Salvar",
}: {
  action: (prev: ActionResult<T> | null, fd: FormData) => Promise<ActionResult<T> | null>;
  initial?: {
    id: string;
    name: string;
    cnpj: string | null;
    website: string | null;
    industry: string | null;
    size: string | null;
    source: "site_contact" | "referral" | "event" | "outbound" | "other";
    notes: string | null;
    legalName?: string | null;
    address?: string | null;
    representativeName?: string | null;
    representativeRole?: string | null;
  };
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionResult<T> | null, FormData>(action, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="grid max-w-2xl gap-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" defaultValue={initial?.name} required aria-invalid={fe?.name ? true : undefined} />
        <FieldError errors={fe?.name} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="cnpj">
            CNPJ <span className="font-normal text-faint">opcional</span>
          </Label>
          <Input id="cnpj" name="cnpj" defaultValue={initial?.cnpj ?? ""} inputMode="numeric" aria-invalid={fe?.cnpj ? true : undefined} />
          <FieldError errors={fe?.cnpj} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="website">
            Site <span className="font-normal text-faint">opcional</span>
          </Label>
          <Input id="website" name="website" defaultValue={initial?.website ?? ""} placeholder="empresa.com.br" aria-invalid={fe?.website ? true : undefined} />
          <FieldError errors={fe?.website} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="industry">
            Setor <span className="font-normal text-faint">opcional</span>
          </Label>
          <Input id="industry" name="industry" defaultValue={initial?.industry ?? ""} aria-invalid={fe?.industry ? true : undefined} />
          <FieldError errors={fe?.industry} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="size">
            Tamanho <span className="font-normal text-faint">opcional</span>
          </Label>
          <Input id="size" name="size" defaultValue={initial?.size ?? ""} placeholder="1-10, 11-50, 51-200…" aria-invalid={fe?.size ? true : undefined} />
          <FieldError errors={fe?.size} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="source">Origem</Label>
        <select
          id="source"
          name="source"
          defaultValue={initial?.source ?? "outbound"}
          className="h-10 rounded-sm border border-input bg-card px-3 text-sm"
        >
          {SOURCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="grid gap-4 rounded-md border border-border p-4">
        <legend className="px-1 text-sm font-medium">Dados para contrato <span className="font-normal text-faint">opcional</span></legend>
        <div className="grid gap-1.5">
          <Label htmlFor="legalName">Razão social</Label>
          <Input id="legalName" name="legalName" defaultValue={initial?.legalName ?? ""} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="address">Endereço da sede</Label>
          <Input id="address" name="address" defaultValue={initial?.address ?? ""} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="representativeName">Representante legal</Label>
            <Input id="representativeName" name="representativeName" defaultValue={initial?.representativeName ?? ""} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="representativeRole">Cargo do representante</Label>
            <Input id="representativeRole" name="representativeRole" defaultValue={initial?.representativeRole ?? ""} />
          </div>
        </div>
      </fieldset>
      <div className="grid gap-1.5">
        <Label htmlFor="notes">
          Notas <span className="font-normal text-faint">opcional</span>
        </Label>
        <Textarea id="notes" name="notes" defaultValue={initial?.notes ?? ""} rows={4} aria-invalid={fe?.notes ? true : undefined} />
        <FieldError errors={fe?.notes} />
      </div>
      {state && !state.ok && !fe && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.ok && initial && (
        <p role="status" className="text-sm text-success">
          Dados salvos.
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
