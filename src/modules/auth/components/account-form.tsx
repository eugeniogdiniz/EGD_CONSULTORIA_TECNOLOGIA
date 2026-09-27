"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Notice({ kind, text }: { kind: "ok" | "err"; text: string }) {
  return (
    <p
      role={kind === "ok" ? "status" : "alert"}
      className={
        kind === "ok"
          ? "rounded-r-md border-l-[3px] border-success bg-success-soft px-4 py-3 text-sm"
          : "rounded-r-md border-l-[3px] border-danger bg-danger-soft px-4 py-3 text-sm"
      }
    >
      {text}
    </p>
  );
}

export function AccountForm({ name }: { name: string }) {
  const router = useRouter();
  const [nameMsg, setNameMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, setPending] = useState<"name" | "pw" | null>(null);

  async function saveName(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("name") ?? "").trim();
    if (value.length < 2) {
      setNameMsg({ kind: "err", text: "Informe seu nome." });
      return;
    }
    setPending("name");
    const { error } = await authClient.updateUser({ name: value });
    setPending(null);
    setNameMsg(error ? { kind: "err", text: "Não foi possível salvar o nome." } : { kind: "ok", text: "Nome atualizado." });
    if (!error) router.refresh();
  }

  async function savePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;
    setPending("pw");
    const { error } = await authClient.changePassword({
      currentPassword: String(fd.get("current") ?? ""),
      newPassword: String(fd.get("next") ?? ""),
      revokeOtherSessions: true,
    });
    setPending(null);
    if (error) {
      setPwMsg({ kind: "err", text: error.message ?? "Não foi possível alterar a senha. Confira a senha atual." });
      return;
    }
    form.reset();
    setPwMsg({ kind: "ok", text: "Senha alterada. As outras sessões foram encerradas." });
  }

  return (
    <div className="grid items-start gap-6 md:grid-cols-2">
      <form onSubmit={saveName} className="grid gap-4 rounded-lg border border-border bg-card p-6">
        <h2 className="text-base font-semibold">Nome de exibição</h2>
        <div className="grid gap-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" defaultValue={name} autoComplete="name" required />
        </div>
        {nameMsg && <Notice {...nameMsg} />}
        <div>
          <Button type="submit" size="sm" disabled={pending === "name"}>
            {pending === "name" ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
      <form onSubmit={savePassword} className="grid gap-4 rounded-lg border border-border bg-card p-6">
        <h2 className="text-base font-semibold">Senha</h2>
        <div className="grid gap-1.5">
          <Label htmlFor="current">Senha atual</Label>
          <Input id="current" name="current" type="password" autoComplete="current-password" required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="next">Nova senha</Label>
          <Input id="next" name="next" type="password" autoComplete="new-password" required minLength={10} />
          <span className="text-[0.8125rem] text-faint">Mínimo 10 caracteres.</span>
        </div>
        {pwMsg && <Notice {...pwMsg} />}
        <div>
          <Button type="submit" size="sm" disabled={pending === "pw"}>
            {pending === "pw" ? "Salvando…" : "Salvar nova senha"}
          </Button>
        </div>
        <p className="text-[0.8125rem] text-faint">Ao salvar, as outras sessões abertas são encerradas.</p>
      </form>
    </div>
  );
}
