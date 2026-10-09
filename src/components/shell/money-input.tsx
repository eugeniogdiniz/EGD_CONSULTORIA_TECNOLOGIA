"use client";

import { useState } from "react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { centsToReais, reaisToCents } from "@/lib/money";

/**
 * Campo de dinheiro em reais. A pessoa digita "1.500,00" (ou "1500"); o
 * formulário envia centavos inteiros no campo oculto `name`. Serve em
 * formulários de server action e em diálogos com `useActionState`.
 */
export function MoneyInput({
  id,
  name,
  defaultCents,
  required,
  placeholder = "0,00",
  className,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  id: string;
  /** nome do campo em centavos que a action lê */
  name: string;
  defaultCents?: number | null;
  required?: boolean;
  placeholder?: string;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const [reais, setReais] = useState(centsToReais(defaultCents));
  const cents = reaisToCents(reais);
  const invalid = Number.isNaN(cents);
  return (
    <div className={cn("relative", className)}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-faint">R$</span>
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={reais}
        required={required}
        placeholder={placeholder}
        onChange={(e) => setReais(e.target.value)}
        onBlur={() => {
          if (cents != null && !Number.isNaN(cents)) setReais(centsToReais(cents));
        }}
        aria-invalid={ariaInvalid || invalid || undefined}
        aria-describedby={ariaDescribedBy}
        className="pl-9 tabular-nums"
      />
      <input type="hidden" name={name} value={cents == null || Number.isNaN(cents) ? "" : String(cents)} />
    </div>
  );
}
