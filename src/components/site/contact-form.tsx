"use client";

import { useActionState } from "react";
import { submitContact, type ContactState } from "@/modules/leads/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/shell/field-error";

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContact, null);

  if (state?.ok) {
    return (
      <div role="status" className="rounded-lg border border-border bg-card p-8">
        <h2 className="type-h3">Recebemos sua mensagem.</h2>
        <p className="mt-2 text-muted-foreground">Respondemos em até um dia útil, no e-mail informado.</p>
      </div>
    );
  }

  const fe = state && !state.ok ? state.fieldErrors : undefined;
  const invalid = (k: string) => (fe?.[k]?.length ? true : undefined);

  return (
    <form action={action} className="grid gap-5 rounded-lg border border-border bg-card p-6 md:p-8" noValidate>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" autoComplete="name" aria-invalid={invalid("name")} aria-describedby="name-erro" />
          <FieldError id="name-erro" errors={fe?.name} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" autoComplete="email" aria-invalid={invalid("email")} aria-describedby="email-erro" />
          <FieldError id="email-erro" errors={fe?.email} />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="company">
            Empresa <span className="font-normal text-faint">opcional</span>
          </Label>
          <Input id="company" name="company" autoComplete="organization" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="phone">
            Telefone <span className="font-normal text-faint">opcional</span>
          </Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="message">Mensagem</Label>
        <Textarea
          id="message"
          name="message"
          rows={6}
          placeholder="Qual processo, quem faz hoje, quanto tempo leva e o que você espera."
          aria-invalid={invalid("message")}
          aria-describedby="message-erro"
        />
        <FieldError id="message-erro" errors={fe?.message} />
      </div>
      {state && !state.ok && !fe && (
        <p className="rounded-r-md border-l-[3px] border-danger bg-danger-soft px-4 py-3 text-sm" role="alert">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className="text-[0.8125rem] text-faint">Usamos seus dados só para responder a esta mensagem.</span>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Enviando…" : "Enviar mensagem"}
        </Button>
      </div>
    </form>
  );
}
