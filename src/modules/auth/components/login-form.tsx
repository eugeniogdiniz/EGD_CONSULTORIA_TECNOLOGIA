"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { safeNextPath } from "@/modules/auth/safe-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const notice =
    params.get("convite") === "aceito"
      ? "Organização vinculada. Entre com sua senha."
      : params.get("senha") === "redefinida"
        ? "Senha redefinida. Entre com a nova senha."
        : null;
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // segundo fator: depois da senha, contas com 2FA ativo informam o código do app ou um de recuperação
  const [step, setStep] = useState<"password" | "code">("password");
  const [useBackup, setUseBackup] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  // marca o formulário como hidratado: antes disso um submit faria GET nativo
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const { data, error } = await authClient.signIn.email({
      email: String(fd.get("email") ?? "").trim().toLowerCase(),
      password: String(fd.get("password") ?? ""),
    });
    setPending(false);
    if (error) {
      setError(error.status === 429 ? (error.message ?? "Muitas tentativas. Aguarde 15 minutos.") : "E-mail ou senha incorretos.");
      return;
    }
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      setStep("code");
      return;
    }
    finish((data?.user as { role?: string } | undefined)?.role);
  }

  function finish(role: string | undefined) {
    router.push(safeNextPath(next) ?? (role === "admin" || role === "collaborator" ? "/admin" : "/portal"));
    router.refresh();
  }

  async function onVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const code = String(new FormData(e.currentTarget).get("code") ?? "").trim();
    const { data, error } = useBackup
      ? await authClient.twoFactor.verifyBackupCode({ code, trustDevice })
      : await authClient.twoFactor.verifyTotp({ code: code.replace(/\s/g, ""), trustDevice });
    setPending(false);
    if (error) {
      setError(error.status === 429 ? "Muitas tentativas. Aguarde um pouco." : "Código inválido ou expirado.");
      return;
    }
    finish((data?.user as { role?: string } | undefined)?.role);
  }

  return (
    <>
      <h1 className="type-h3 mt-5">{step === "code" ? "Verificação em duas etapas" : "Entrar no portal"}</h1>
      {notice && (
        <p role="status" className="mt-4 rounded-r-md border-l-[3px] border-success bg-success-soft px-4 py-3 text-sm">
          {notice}
        </p>
      )}
      {step === "code" ? (
        <form onSubmit={onVerify} className="mt-6 grid gap-4" data-hydrated={hydrated ? "" : undefined}>
          <p className="text-sm text-muted-foreground">
            {useBackup
              ? "Digite um dos códigos de recuperação que você guardou. Cada um vale uma vez."
              : "Digite o código de 6 dígitos do seu aplicativo autenticador."}
          </p>
          <div className="grid gap-1.5">
            <Label htmlFor="code">{useBackup ? "Código de recuperação" : "Código"}</Label>
            <Input
              id="code"
              name="code"
              inputMode={useBackup ? "text" : "numeric"}
              autoComplete="one-time-code"
              autoFocus
              required
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" name="trustDevice" checked={trustDevice} onChange={(e) => setTrustDevice(e.target.checked)} />
            Confiar neste dispositivo por 30 dias
          </label>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Verificando…" : "Verificar"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setUseBackup((v) => !v);
              setError(null);
            }}
            className="text-left text-sm font-medium text-link underline decoration-1 underline-offset-[3px] hover:text-signal-strong"
          >
            {useBackup ? "Usar o aplicativo autenticador" : "Usar um código de recuperação"}
          </button>
        </form>
      ) : (
      <form onSubmit={onSubmit} className="mt-6 grid gap-4" data-hydrated={hydrated ? "" : undefined}>
        <div className="grid gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Entrando…" : "Entrar"}
        </Button>
        <Link href="/recuperar-senha" className="text-sm font-medium text-link underline decoration-1 underline-offset-[3px] hover:text-signal-strong">
          Esqueci minha senha
        </Link>
      </form>
      )}
      <p className="mt-6 text-[0.8125rem] text-faint">Acesso por convite. Se você é cliente e ainda não tem acesso, fale com a EGD.</p>
    </>
  );
}
