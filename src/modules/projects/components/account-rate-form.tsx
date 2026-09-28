"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shell/field-error";
import { updateAccountRateForm } from "@/modules/projects/form-actions";
import type { ActionResult } from "@/lib/action-result";

/** Formata cents como "150,00" pro campo de texto. */
function centsToReais(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "150,00" ou "150.00" ou "" → number|"" pra ir pro schema como cents. */
function reaisInputToCents(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "") return "";
  const norm = trimmed.replace(/\./g, "").replace(",", ".");
  const parsed = Number(norm);
  if (!Number.isFinite(parsed) || parsed < 0) return raw; // deixa o schema recusar
  return String(Math.round(parsed * 100));
}

export function AccountRateForm({ initialCents }: { initialCents: number | null }) {
  const router = useRouter();
  const [reais, setReais] = useState<string>(centsToReais(initialCents));
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    async (_prev, fd) => {
      // O schema espera cents ou "". Convertemos aqui.
      fd.set("hourlyRateCents", reaisInputToCents(String(fd.get("hourlyRateCentsDisplay") ?? "")));
      fd.delete("hourlyRateCentsDisplay");
      const r = await updateAccountRateForm(null, fd);
      if (r?.ok) router.refresh();
      return r;
    },
    null,
  );

  const fe = state && !state.ok ? state.fieldErrors : undefined;
  const cleared = state?.ok && reais === "";

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-border bg-card p-6">
      <h2 className="text-base font-semibold">Rate por hora</h2>
      <p className="text-[0.8125rem] text-muted-foreground">
        Usado no custo estimado do financeiro dos projetos. Deixe em branco pra não contar.
      </p>
      <div className="grid gap-1.5">
        <Label htmlFor="rate">Valor por hora (R$)</Label>
        <div className="flex items-center gap-2">
          <span className="type-data text-sm text-muted-foreground">R$</span>
          <Input
            id="rate"
            name="hourlyRateCentsDisplay"
            value={reais}
            onChange={(e) => setReais(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            aria-invalid={fe?.hourlyRateCents ? true : undefined}
          />
        </div>
        <FieldError errors={fe?.hourlyRateCents} />
        <span className="text-[0.8125rem] text-faint">
          Ex.: "150,00" para R$ 150 por hora.
        </span>
      </div>
      {state && !state.ok && !fe && (
        <p role="alert" className="rounded-r-md border-l-[3px] border-danger bg-danger-soft px-4 py-3 text-sm">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="rounded-r-md border-l-[3px] border-success bg-success-soft px-4 py-3 text-sm">
          {cleared ? "Rate removido." : "Rate atualizado."}
        </p>
      )}
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
