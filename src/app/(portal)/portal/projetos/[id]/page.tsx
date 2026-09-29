import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { requirePortal } from "@/modules/auth/context";
import {
  getPortalProject,
  listPortalDeliverables,
  listPortalMilestones,
  listPortalPhases,
} from "@/modules/portal-projects/queries";
import {
  milestoneState,
  phaseState,
  portalStatusLabel,
  PROJECT_STATUS_LABEL,
  STATUS_STYLE,
  summarizeProject,
} from "@/modules/portal-projects/scope";
import { PageHeader, Block } from "@/components/shell/page-header";
import { SITE } from "@/content/site";
import { formatIsoDate } from "@/lib/format";

export const metadata = { title: "Projeto" };

const PHASE_LABEL = { done: "Concluída", active: "Em andamento", upcoming: "A iniciar" } as const;
const PHASE_STYLE = {
  done: STATUS_STYLE.delivered,
  active: STATUS_STYLE.active,
  upcoming: STATUS_STYLE.planning,
} as const;

const chip = "inline-flex h-[22px] items-center rounded-sm border px-2 text-xs font-medium whitespace-nowrap";

export default async function PortalProjetoPage({ params }: PageProps<"/portal/projetos/[id]">) {
  const ctx = await requirePortal();
  const { id } = await params;
  const project = await getPortalProject(ctx, id);
  if (!project) notFound();

  const [phases, milestones, deliverables] = await Promise.all([
    listPortalPhases(ctx, id),
    listPortalMilestones(ctx, id),
    listPortalDeliverables(ctx, id),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const summary = summarizeProject(deliverables, milestones, today);
  const phaseName = new Map(phases.map((p) => [p.id, p.name]));
  const upcoming = deliverables
    .filter((d) => d.status !== "done")
    .sort((a, b) => (a.dueAt ?? "9999-12-31").localeCompare(b.dueAt ?? "9999-12-31"))
    .slice(0, 5);
  const doneMilestones = milestones.filter((m) => m.completedAt).length;

  return (
    <>
      <PageHeader
        title={project.title}
        meta={
          <span className="flex flex-wrap items-center gap-x-2">
            <span className={cn(chip, STATUS_STYLE[project.status])}>{PROJECT_STATUS_LABEL[project.status]}</span>
            <span className="text-faint">·</span>
            <span>{project.companyName}</span>
            {project.startedAt && (
              <>
                <span className="text-faint">·</span>
                <span>
                  iniciado <span className="type-data">{formatIsoDate(project.startedAt)}</span>
                </span>
              </>
            )}
            {project.endedAt && (
              <>
                <span className="text-faint">·</span>
                <span>
                  encerrado <span className="type-data">{formatIsoDate(project.endedAt)}</span>
                </span>
              </>
            )}
          </span>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <Block title="Fases" aside={`${phases.length} fase${phases.length === 1 ? "" : "s"}`}>
            {phases.length === 0 ? (
              <p className="text-sm text-muted-foreground">As fases serão publicadas pela equipe da EGD.</p>
            ) : (
              <ul className="grid gap-2.5">
                {phases.map((phase, i) => {
                  const own = deliverables.filter((d) => d.phaseId === phase.id);
                  const done = own.filter((d) => d.status === "done").length;
                  const waiting = own.filter((d) => d.status === "blocked").length;
                  const state = phaseState({ total: own.length, done }, today, phase.startedAt);
                  const pct = own.length === 0 ? 0 : Math.round((done / own.length) * 100);
                  return (
                    <li key={phase.id} className="rounded-md border border-border bg-card p-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="type-data text-xs text-faint">{String(i + 1).padStart(2, "0")}</span>
                        <h4 className="text-sm font-semibold">{phase.name}</h4>
                        <span className={cn(chip, "ml-auto", PHASE_STYLE[state])}>{PHASE_LABEL[state]}</span>
                      </div>
                      <div className="type-data mt-1 text-xs text-muted-foreground">
                        {formatIsoDate(phase.startedAt)} → {formatIsoDate(phase.endedAt)}
                      </div>
                      <div
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Progresso da fase ${phase.name}`}
                        className="mt-2.5 h-1.5 overflow-hidden rounded-sm border border-border bg-subtle"
                      >
                        <div className={cn("h-full", state === "done" ? "bg-success" : "bg-link")} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="type-micro mt-1.5 text-muted-foreground">
                        {done} de {own.length} entregas concluídas
                        {waiting > 0 && ` · ${waiting} em espera`}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Block>

          <Block title="Marcos" aside={`${doneMilestones} de ${milestones.length} concluídos`}>
            {milestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum marco publicado ainda.</p>
            ) : (
              <ul>
                {milestones.map((m) => {
                  const state = milestoneState(m, today);
                  return (
                    <li
                      key={m.id}
                      className="grid grid-cols-[20px_1fr] items-center gap-x-3 gap-y-0.5 border-t border-border py-2 text-sm first:border-t-0 sm:grid-cols-[20px_92px_1fr_auto]"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm border-[1.5px] border-strong text-[10px] leading-none",
                          state === "done" && "border-success bg-success text-white",
                        )}
                      >
                        {state === "done" ? "✓" : ""}
                      </span>
                      <span
                        className={cn(
                          "type-data text-xs text-muted-foreground",
                          state === "late" && "font-medium text-danger",
                        )}
                      >
                        {formatIsoDate(m.dueAt)}
                      </span>
                      <span className={cn("max-sm:col-start-2", state === "done" && "text-muted-foreground")}>
                        {m.name}
                        <span className="sr-only">
                          {state === "done" ? " (concluído)" : state === "late" ? " (atrasado)" : " (pendente)"}
                        </span>
                      </span>
                      <span className="type-micro text-faint max-sm:col-start-2">{m.phaseId ? phaseName.get(m.phaseId) : ""}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Block>

          <Block title="Próximas entregas" aside="apenas as que a equipe compartilhou">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma entrega em aberto compartilhada.</p>
            ) : (
              <ul>
                {upcoming.map((d) => (
                  <li key={d.id} className="border-t border-border first:border-t-0">
                    <Link
                      href={`/portal/projetos/${id}/entregas/${d.id}`}
                      className="grid grid-cols-[1fr_auto] items-center gap-x-2.5 gap-y-1.5 py-2.5 text-sm hover:text-link sm:grid-cols-[1fr_92px_110px]"
                    >
                      <span className="max-sm:col-span-2">
                        <span className="block font-medium">{d.title}</span>
                        <span className="type-micro block text-muted-foreground">
                          {d.phaseId ? phaseName.get(d.phaseId) : "Sem fase"}
                        </span>
                      </span>
                      <span className="type-data text-xs text-muted-foreground sm:text-right">{formatIsoDate(d.dueAt)}</span>
                      <span className="text-right">
                        <span className={cn(chip, STATUS_STYLE[d.status])}>{portalStatusLabel(d.status)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </div>

        <div className="flex flex-col gap-6">
          <Block title="Resumo">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <span className={cn(chip, STATUS_STYLE[project.status])}>{PROJECT_STATUS_LABEL[project.status]}</span>
              </dd>
              <dt className="text-muted-foreground">Empresa</dt>
              <dd>{project.companyName}</dd>
              <dt className="text-muted-foreground">Início</dt>
              <dd className="type-data">{formatIsoDate(project.startedAt)}</dd>
              <dt className="text-muted-foreground">Progresso</dt>
              <dd className="type-data">
                {summary.done} de {summary.total} · {summary.percent}%
              </dd>
              <dt className="text-muted-foreground">Responsável EGD</dt>
              <dd>{project.ownerName}</dd>
            </dl>
          </Block>
          <Block title="Precisa de algo?">
            <p className="text-sm text-muted-foreground">
              Escreva para{" "}
              <a href={`mailto:${SITE.email}`} className="font-medium text-link underline decoration-1 underline-offset-[3px]">
                {SITE.email}
              </a>
              . Você também pode comentar em cada entrega.
            </p>
          </Block>
        </div>
      </div>
    </>
  );
}
