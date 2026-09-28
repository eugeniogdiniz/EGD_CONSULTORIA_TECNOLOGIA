"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotForm() {
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim().toLowerCase();
    // A resposta é a mesma exista ou não o e-mail (sem revelar contas).
    await authClient.requestPasswordReset({ email, redirectTo: "/redefinir-senha" });
    setPending(false);
    setDone(true);
  }

  return (
    <>
      <h1 className="type-h3 mt-5">Recuperar senha</h1>
      <p className="mt-2 text-sm text-muted-foreground">Informe o e-mail da sua conta. Se ele existir, enviamos um link válido por 1 hora.</p>
      {done ? (
        <p role="status" className="mt-6 rounded-r-md border-l-[3px] border-success bg-success-soft px-4 py-3 text-sm">
          Se o e-mail existir, enviamos um link válido por 1 hora. Verifique também a caixa de spam.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Enviando…" : "Enviar link"}
          </Button>
        </form>
      )}
    </>
  );
}
