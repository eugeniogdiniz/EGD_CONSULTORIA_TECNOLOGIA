import { Block } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { setWeeklyDigestPortalForm } from "../form-actions";

/** Interruptor do andamento semanal por e-mail, em /portal/conta (vale para a organização ativa). */
export function WeeklyDigestForm({ organizationName, enabled }: { organizationName: string; enabled: boolean }) {
  return (
    <Block title="Resumo semanal por e-mail" aside={enabled ? "ligado" : "desligado"}>
      <form action={setWeeklyDigestPortalForm} className="grid max-w-lg gap-3">
        <input type="hidden" name="enabled" value={enabled ? "0" : "1"} />
        <p className="text-sm text-muted-foreground">
          Toda segunda-feira, um e-mail com o que foi concluído na semana anterior, o que está previsto para a semana e as solicitações
          que aguardam você nos projetos da <strong>{organizationName}</strong>. Vale para todas as pessoas da organização.
        </p>
        <div>
          <Button type="submit" size="sm" variant={enabled ? "outline" : "default"}>
            {enabled ? "Desligar resumo semanal" : "Ligar resumo semanal"}
          </Button>
        </div>
      </form>
    </Block>
  );
}
