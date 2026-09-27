"use client";

import { useActionState } from "react";
import { acceptInviteAction, type AcceptState } from "@/modules/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shell/field-error";

export function AcceptInviteForm({ token, email, organizationName }: { token: string; email: string; organizationName: string }) {
  const [state, action, pending] = useActionState<AcceptState, FormData>(acceptInviteAction, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <>
      <h1 className="type-h3 mt-5 leading-tight">Crie sua senha para acessar o portal do {organizationName}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Defina um nome de exibição e uma senha.</p>
      <form action={action} className="mt-6 grid gap-4">
        <input type="hidden" name="token" value={token} />
        <div className="grid gap-1.5">
          <Label htmlFor="name">Seu nome</Label>
          <Input id="name" name="name" autoComplete="name" required aria-invalid={fe?.name ? true : undefined} />
          <FieldError errors={fe?.name} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} aria-invalid={fe?.password ? true : undefined} />
          <span className="text-[0.8125rem] text-faint">Mínimo 10 caracteres. Evite senhas usadas em outros serviços.</span>
          <FieldError errors={fe?.password} />
        </div>
        {state && !state.ok && !fe && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Criando…" : "Criar minha conta"}
        </Button>
      </form>
      <p className="mt-6 text-[0.8125rem] text-faint">
        Conta para <span className="type-data">{email}</span>. O convite vale por 7 dias.
      </p>
    </>
  );
}

/** Usuário já existente: só vincula a organização. Nome e senha fixos são ignorados pelo domínio. */
export function LinkExistingForm({ token, email, organizationName }: { token: string; email: string; organizationName: string }) {
  const [state, action, pending] = useActionState<AcceptState, FormData>(acceptInviteAction, null);
  return (
    <>
      <h1 className="type-h3 mt-5 leading-tight">Vincular sua conta ao {organizationName}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Você já tem conta com o e-mail <span className="type-data">{email}</span>. Confirme para acessar também esta organização.
      </p>
      <form action={action} className="mt-6 grid gap-4">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="name" value="existente" />
        <input type="hidden" name="password" value="nao-usado-1" />
        {state && !state.ok && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Vinculando…" : `Vincular ao ${organizationName}`}
        </Button>
      </form>
      <p className="mt-6 text-[0.8125rem] text-faint">Depois de vincular, entre com a sua senha atual.</p>
    </>
  );
}
