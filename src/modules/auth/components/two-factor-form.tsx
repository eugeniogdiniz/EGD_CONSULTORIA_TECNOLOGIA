"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Enrollment = { qr: string; secret: string; backupCodes: string[] };

/** "otpauth://totp/EGD:a@b.com?secret=XXXX&issuer=EGD" → XXXX (base32, como o app autenticador lê). */
const secretFromUri = (uri: string) => new URL(uri).searchParams.get("secret") ?? "";

function BackupCodes({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-2 rounded-md border border-border bg-subtle p-3">
      <p className="text-sm">
        <strong>Guarde estes códigos de recuperação.</strong> Cada um vale uma vez e é a única forma de entrar se você
        perder o aparelho. Eles não serão exibidos de novo.
      </p>
      <ul aria-label="Códigos de recuperação" className="type-data grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(codes.join("\n"));
            setCopied(true);
          }}
        >
          {copied ? "Copiados" : "Copiar códigos"}
        </Button>
      </div>
    </div>
  );
}

export function TwoFactorForm({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const fail = (message?: string) => setError(message ?? "Não foi possível concluir. Confira a senha e tente de novo.");

  async function start() {
    setPending(true);
    setError(null);
    const { data, error } = await authClient.twoFactor.enable({ password });
    if (error || !data || !("totpURI" in data)) {
      setPending(false);
      return fail(error?.message);
    }
    setEnrollment({
      qr: await QRCode.toDataURL(data.totpURI, { margin: 1, width: 192 }),
      secret: secretFromUri(data.totpURI),
      backupCodes: data.backupCodes,
    });
    setPassword("");
    setPending(false);
  }

  async function confirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s/g, "");
    const { error } = await authClient.twoFactor.verifyTotp({ code });
    setPending(false);
    if (error) return fail("Código inválido. Confira o horário do aparelho e tente de novo.");
    setEnrollment(null);
    setNotice("Verificação em duas etapas ativada.");
    router.refresh();
  }

  async function regenerate() {
    setPending(true);
    setError(null);
    const { data, error } = await authClient.twoFactor.generateBackupCodes({ password });
    setPending(false);
    if (error || !data) return fail(error?.message);
    setNewCodes(data.backupCodes);
    setPassword("");
  }

  async function disable() {
    setPending(true);
    setError(null);
    const { error } = await authClient.twoFactor.disable({ password });
    setPending(false);
    if (error) return fail(error.message);
    setPassword("");
    setNewCodes(null);
    setNotice("Verificação em duas etapas desativada.");
    router.refresh();
  }

  return (
    <section aria-labelledby="tf-title" className="grid gap-4 rounded-lg border border-border bg-card p-6">
      <div>
        <h2 id="tf-title" className="text-base font-semibold">Verificação em duas etapas</h2>
        <p className="mt-1 text-[0.8125rem] text-muted-foreground">
          {enabled
            ? "Ativa. Ao entrar, além da senha, você informa um código do aplicativo autenticador."
            : "Recomendada. Além da senha, o login passa a exigir um código do seu aplicativo autenticador (Google Authenticator, 1Password, Authy…)."}
        </p>
      </div>

      {notice && (
        <p role="status" className="rounded-r-md border-l-[3px] border-success bg-success-soft px-4 py-3 text-sm">
          {notice}
        </p>
      )}

      {enrollment ? (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-[192px_1fr] sm:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL gerada no navegador */}
            <img src={enrollment.qr} alt="QR code para o aplicativo autenticador" width={192} height={192} className="rounded-sm border border-border" />
            <div className="grid gap-1 text-sm">
              <p>1. Escaneie o QR code com o aplicativo autenticador.</p>
              <p className="text-muted-foreground">
                Sem câmera? Digite esta chave manualmente:
              </p>
              <code className="type-data break-all rounded-sm border border-border bg-subtle px-2 py-1 text-xs">{enrollment.secret}</code>
            </div>
          </div>
          <BackupCodes codes={enrollment.backupCodes} />
          <form onSubmit={confirm} className="grid max-w-xs gap-2">
            <Label htmlFor="tf-code">2. Digite o código de 6 dígitos para confirmar</Label>
            <Input id="tf-code" name="code" inputMode="numeric" autoComplete="one-time-code" required />
            <div>
              <Button type="submit" size="sm" disabled={pending}>{pending ? "Verificando…" : "Confirmar e ativar"}</Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid max-w-sm gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="tf-password">Confirme com sua senha</Label>
            <Input id="tf-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            {enabled ? (
              <>
                <Button type="button" size="sm" variant="outline" disabled={pending || password === ""} onClick={regenerate}>
                  Gerar novos códigos de recuperação
                </Button>
                <Button type="button" size="sm" variant="destructive" disabled={pending || password === ""} onClick={disable}>
                  Desativar
                </Button>
              </>
            ) : (
              <Button type="button" size="sm" disabled={pending || password === ""} onClick={start}>
                {pending ? "Aguarde…" : "Ativar"}
              </Button>
            )}
          </div>
        </div>
      )}

      {newCodes && <BackupCodes codes={newCodes} />}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
