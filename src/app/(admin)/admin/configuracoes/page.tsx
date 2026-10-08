import { requireOwner } from "@/modules/auth/context";
import { BOOLEAN_SETTINGS, LEGAL_SETTINGS, listSettings, SETTINGS, type SettingKey } from "@/modules/settings/queries";
import { setLegalSettingsForm, setSettingForm } from "@/modules/settings/form-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { countWithoutTwoFactor } from "@/modules/team/queries";
import { PageHeader, Block } from "@/components/shell/page-header";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  // o dono alcança esta tela mesmo sem 2FA: é aqui que ele desliga a exigência, se precisar
  await requireOwner({ allowWithout2fa: true });
  const [values, pending] = await Promise.all([listSettings(), countWithoutTwoFactor()]);
  const hint: Partial<Record<SettingKey, string>> = {
    "security.require_2fa_team": `${pending.team} pessoa${pending.team === 1 ? "" : "s"} da equipe ainda sem 2FA (inclui você, se for o caso).`,
    "security.require_2fa_client": `${pending.client} usuário${pending.client === 1 ? "" : "s"} do portal ainda sem 2FA.`,
  };
  return (
    <>
      <PageHeader title="Configurações" meta="Regras do sistema que valem para todo mundo. Só o administrador altera." />
      <Block title="Segurança">
        <ul className="divide-y divide-border">
          {BOOLEAN_SETTINGS.map((key) => {
            const enabled = Boolean(values[key]);
            return (
              <li key={key} className="flex items-center justify-between gap-4 py-3" data-testid={`setting-${key}`}>
                <div>
                  <div className="text-sm font-medium">{SETTINGS[key].label}</div>
                  <div className="type-micro text-muted-foreground">{SETTINGS[key].description}</div>
                  <div className="type-micro mt-0.5 text-faint">{hint[key]}</div>
                </div>
                <form action={setSettingForm} className="inline-flex">
                  <input type="hidden" name="key" value={key} />
                  <input type="hidden" name="value" value={enabled ? "0" : "1"} />
                  <button
                    type="submit"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={`${SETTINGS[key].label}: ${enabled ? "ligado" : "desligado"}`}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 ${enabled ? "bg-success" : "bg-faint"}`}
                  >
                    <span className={`inline-block size-4 rounded-full bg-card shadow transition-transform ${enabled ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
        <p className="type-micro mt-4 max-w-[90ch] text-muted-foreground">
          Quem ficar sem o segundo fator com a exigência ligada só consegue abrir Minha conta até ativar (o administrador também alcança esta tela, para desligar a regra). Se alguém perder o aparelho e os códigos, o reset é pelo script <code className="type-data">auth:reset-2fa</code> (runbook §14).
        </p>
      </Block>
      <Block title="Dados da empresa" aside="entram no contrato e no termo de aceite">
        <form action={setLegalSettingsForm} className="grid gap-4 md:grid-cols-2" data-testid="dados-empresa">
          {LEGAL_SETTINGS.map((key) => (
            <div key={key} className={`grid gap-1.5 ${key === "legal.endereco" ? "md:col-span-2" : ""}`}>
              <label htmlFor={`legal-${key}`} className="text-sm font-medium">{SETTINGS[key].label}</label>
              <Input id={`legal-${key}`} name={key} defaultValue={String(values[key] ?? "")} maxLength={300} />
              <span className="type-micro text-faint">{SETTINGS[key].description}</span>
            </div>
          ))}
          <div className="md:col-span-2">
            <Button type="submit" size="sm">Salvar dados da empresa</Button>
          </div>
        </form>
      </Block>
    </>
  );
}
