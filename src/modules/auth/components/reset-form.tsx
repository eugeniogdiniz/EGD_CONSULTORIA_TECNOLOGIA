"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const a = String(fd.get("password") ?? "");
    const b = String(fd.get("confirm") ?? "");
    if (a !== b) {
      setError("As senhas não coincidem.");
      return;
    }
    setPending(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword: a, token });
    setPending(false);
    if (error) {
      setError(error.message ?? "Não foi possível redefinir a senha. Peça um novo link.");
      return;
    }
    router.push("/entrar?senha=redefinida");
  }

  return (
    <>
      <h1 className="type-h3 mt-5">Definir nova senha</h1>
      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="password">Nova senha</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
          <span className="text-[0.8125rem] text-faint">Mínimo 10 caracteres. Evite senhas usadas em outros serviços.</span>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="confirm">Confirmar nova senha</Label>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} />
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Salvando…" : "Salvar nova senha"}
        </Button>
      </form>
    </>
  );
}
