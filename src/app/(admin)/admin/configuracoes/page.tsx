import { requireOwner } from "@/modules/auth/context";
import { listSettings, SETTINGS, type SettingKey } from "@/modules/settings/queries";
import { setSettingForm } from "@/modules/settings/form-actions";
import { countWithoutTwoFactor } from "@/modules/team/queries";
import { PageHeader, Block } from "@/components/shell/page-header";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  // o dono alcança esta tela mesmo sem 2FA: é aqui que ele desliga a exigência, se precisar
  await requireOwner({ allowWithout2fa: true });
  const [values, pending] = await Promise.all([listSettings(), countWithoutTwoFactor()]);
  const hint: Record<SettingKey, string> = {
    "security.require_2fa_team": `${pending.team} pessoa${pending.team === 1 ? "" : "s"} da equipe ainda sem 2FA (inclui você, se for o caso).`,
    "security.require_2fa_client": `${pending.client} usuário${pending.client === 1 ? "" : "s"} do portal ainda sem 2FA.`,
  };
  return (
    <>
      <PageHeader title="Configurações" meta="Regras do sistema que valem para todo mundo. Só o administrador altera." />
      <Block title="Segurança">
        <ul className="divide-y divide-border">
          {(Object.keys(SETTINGS) as SettingKey[]).map((key) => {
            const enabled = values[key];
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
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 ${enabled ? "bg-success" : "bg-border-strong"}`}
                  >
                    <span className={`inline-block size-4 rounded-full bg-card shadow transition-transform ${enabled ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
        <p className="type-micro mt-4 text-muted-foreground">
          Quem ficar sem o segundo fator com a exigência ligada só consegue abrir Minha conta até ativar (o administrador também alcança esta tela, para desligar a regra). Se alguém perder o aparelho e os códigos, o reset é pelo script <code className="type-data">auth:reset-2fa</code> (runbook §14).
        </p>
      </Block>
    </>
  );
}
