import Link from "next/link";
import { requireOwner } from "@/modules/auth/context";
import { listJobsWithLastRun, listRuns } from "@/modules/jobs/queries";
import { getJob, JOBS } from "@/modules/jobs/registry";
import { describeSchedule, nextRunAt } from "@/modules/jobs/schedule";
import { getSchedulerState, jobsEnabled } from "@/modules/jobs/scheduler";
import { triggerJobForm } from "@/modules/jobs/form-actions";
import { JobSwitch } from "@/modules/jobs/components/job-switch";
import { PageHeader, Block, EmptyState } from "@/components/shell/page-header";
import { ConfirmAction } from "@/components/shell/confirm-action";
import { Status } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { formatBr } from "@/modules/reports/dates";

export const metadata = { title: "Automações" };
export const dynamic = "force-dynamic";

const STATUS_TONE = { ok: "ok", error: "err", running: "info" } as const;
const STATUS_LABEL = { ok: "ok", error: "erro", running: "em execução" } as const;

function relative(from: Date, now: Date): string {
  const s = Math.max(0, Math.round((now.getTime() - from.getTime()) / 1000));
  if (s < 90) return `há ${s} s`;
  const m = Math.round(s / 60);
  if (m < 90) return `há ${m} min`;
  return `há ${Math.round(m / 60)} h`;
}

function duration(start: Date, end: Date | null): string {
  if (!end) return "—";
  const s = (end.getTime() - start.getTime()) / 1000;
  return `${s.toFixed(1).replace(".", ",")} s`;
}

export default async function AutomacoesPage() {
  const ctx = await requireOwner();
  const now = new Date();
  const [jobs, runs] = await Promise.all([listJobsWithLastRun(ctx, now), listRuns(ctx, 30)]);
  const scheduler = getSchedulerState();
  const enabledHere = jobsEnabled();
  const next = JOBS.filter((j) => jobs.find((r) => r.key === j.key)?.enabled)
    .map((j) => ({ name: j.name, ...nextRunAt(j.schedule, now) }))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];

  return (
    <>
      <PageHeader title="Automações" meta="O que o sistema faz sozinho: resumos por e-mail e propostas vencidas. Horários em Brasília." />

      {enabledHere ? (
        <p role="status" className="rounded-r-md border-l-[3px] border-success bg-success-soft px-4 py-3 text-sm">
          <strong>Agendador ligado neste servidor.</strong>{" "}
          {scheduler.lastTickAt ? `Última verificação ${relative(scheduler.lastTickAt, now)}` : "Primeira verificação em até 30 s depois de o servidor subir"}
          {next && ` · próxima automação: ${next.name}, ${formatBr(next.date)} às ${next.time}`}.
        </p>
      ) : (
        <p role="status" className="rounded-r-md border-l-[3px] border-warning bg-warning-soft px-4 py-3 text-sm">
          <strong>Agendador desligado</strong> neste servidor (<code className="type-data">JOBS_ENABLED</code>). As automações só rodam por &ldquo;Enviar agora&rdquo;.
        </p>
      )}

      <div tabIndex={0} role="region" aria-label="Tabela, role horizontalmente se necessário" className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-subtle text-left text-muted-foreground">
              <th className="h-10 px-4 font-medium">Automação</th>
              <th className="h-10 px-4 font-medium">Quando</th>
              <th className="h-10 px-4 font-medium">Para quem</th>
              <th className="h-10 px-4 font-medium">Ligada</th>
              <th className="h-10 px-4 font-medium">Última execução</th>
              <th className="h-10 px-4 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => {
              const def = getJob(j.key)!;
              const isMail = j.key !== "propostas-expirar" && j.key !== "notificacoes-limpar";
              return (
                <tr key={j.key} className="border-t border-border align-top" data-testid={`job-${j.key}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{j.name}</div>
                    <div className="type-micro mt-0.5 max-w-[22rem] text-faint">{j.description}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{describeSchedule(def.schedule)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{j.recipients.includes("@") ? <span className="type-data">{j.recipients}</span> : j.recipients}</td>
                  <td className="px-4 py-3">
                    <JobSwitch job={j.key} enabled={j.enabled} name={j.name} />
                  </td>
                  <td className="px-4 py-3">
                    {j.lastRun ? (
                      <>
                        <Status tone={STATUS_TONE[j.lastRun.status]}>{formatDateTime(j.lastRun.startedAt)}</Status>
                        <div className="type-micro mt-0.5 max-w-[20rem] text-faint">
                          {j.lastRun.status === "error" ? j.lastRun.error : j.lastRun.status === "running" ? "em execução" : j.lastRun.text}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">nunca executou</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 whitespace-nowrap">
                      <Button variant="outline" size="sm" render={<Link href={`/admin/automacoes/${j.key}/previa`} />}>
                        Prévia
                      </Button>
                      <ConfirmAction
                        trigger={
                          <Button size="sm" variant={isMail ? "default" : "outline"} disabled={j.running}>
                            {isMail ? "Enviar agora" : "Executar agora"}
                          </Button>
                        }
                        title={isMail ? `Enviar "${j.name}" agora?` : `Executar "${j.name}" agora?`}
                        description={
                          isMail
                            ? `O e-mail vai de verdade, agora, com os dados atuais, para ${j.recipients}. A execução agendada do dia continua acontecendo.`
                            : j.key === "notificacoes-limpar"
                              ? "As notificações antigas são apagadas agora. A execução agendada do dia continua acontecendo."
                              : "As propostas enviadas com validade vencida passam a \"Expirada\" agora. A execução agendada do dia continua acontecendo."
                        }
                        confirmLabel={isMail ? "Enviar agora" : "Executar agora"}
                        destructive={false}
                        action={triggerJobForm}
                        fields={{ job: j.key }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">
        Enviar agora manda de verdade, agora, com os dados atuais, e não substitui a execução agendada do dia. Desligar uma automação não apaga o histórico.
      </p>

      <Block title="Histórico" aside="últimas 30 execuções" padded={false}>
        {runs.length === 0 ? (
          <EmptyState title="Nenhuma execução ainda." text="As execuções agendadas e manuais aparecem aqui com status, duração e resumo." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-subtle text-left text-muted-foreground">
                  <th className="h-10 px-4 font-medium">Quando</th>
                  <th className="h-10 px-4 font-medium">Automação</th>
                  <th className="h-10 px-4 font-medium">Gatilho</th>
                  <th className="h-10 px-4 font-medium">Status</th>
                  <th className="h-10 px-4 text-right font-medium">Duração</th>
                  <th className="h-10 px-4 font-medium">Resumo</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{formatDateTime(r.startedAt)}</td>
                    <td className="px-4 py-2.5">{getJob(r.job)?.name ?? r.job}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {r.trigger === "manual" ? `manual · ${r.actorName ?? "—"}` : "agendada"}
                      {r.trigger === "schedule" && r.attempt > 1 ? ` · ${r.attempt}ª tentativa` : ""}
                    </td>
                    <td className="px-4 py-2.5">
                      <Status tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Status>
                    </td>
                    <td className="type-data px-4 py-2.5 text-right whitespace-nowrap">{duration(r.startedAt, r.finishedAt)}</td>
                    <td className="max-w-[28rem] px-4 py-2.5">
                      {r.status === "error" ? (
                        <code className="block truncate text-[0.75rem] text-danger">{r.error}</code>
                      ) : (
                        <span className="text-muted-foreground">{String(r.summary.text ?? "")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Block>
    </>
  );
}
