import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { requireOwner } from "@/modules/auth/context";
import {
  getOpportunity,
  listContactsByCompany,
  listInteractions,
  listProposals,
} from "@/modules/crm/queries";
import { changeOpportunityStageForm } from "@/modules/crm/form-actions";
import { PageHeader, Block, EmptyState } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { OpportunityFormDialog } from "@/modules/crm/components/opportunity-form";
import { InteractionFormDialog } from "@/modules/crm/components/interaction-form";
import { LostDialog } from "@/modules/crm/components/lost-dialog";
import { ProposalFormDialog } from "@/modules/crm/components/proposal-form";
import { getProjectByOpportunity, listTemplates } from "@/modules/projects/queries";
import { CreateProjectDialog } from "@/modules/projects/components/create-project-dialog";
import { formatBrlCents, formatDate, formatIsoDate } from "@/lib/format";

const STAGES: Array<"new" | "qualified" | "meeting" | "proposal" | "won" | "lost"> = [
  "new",
  "qualified",
  "meeting",
  "proposal",
  "won",
  "lost",
];

const STAGE_LABEL: Record<string, string> = {
  new: "Novo",
  qualified: "Qualificado",
  meeting: "Reunião",
  proposal: "Proposta",
  won: "Ganho",
  lost: "Perdido",
};

const TYPE_LABEL: Record<string, string> = {
  call: "Ligação",
  email: "E-mail",
  meeting: "Reunião",
  note: "Nota",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviada",
  accepted: "Aceita",
  rejected: "Rejeitada",
  expired: "Expirada",
};

export default async function OportunidadeDetalhePage({
  params,
}: PageProps<"/admin/crm/oportunidades/[id]">) {
  const ctx = await requireOwner();
  const { id } = await params;
  const row = await getOpportunity(ctx, id);
  if (!row) notFound();

  const opp = row.opportunity;
  const company = row.company;
  const contacts = await listContactsByCompany(ctx, company.id);
  const [interactions, proposals, linkedProject, templates] = await Promise.all([
    listInteractions(ctx, { opportunityId: opp.id, limit: 30 }),
    listProposals(ctx, { opportunityId: opp.id }),
    getProjectByOpportunity(ctx, opp.id),
    opp.stage === "won" ? listTemplates(ctx) : Promise.resolve([]),
  ]);

  const stageIndex = STAGES.indexOf(opp.stage);
  const isClosed = opp.stage === "won" || opp.stage === "lost";

  return (
    <>
      <PageHeader
        title={opp.title}
        meta={
          <>
            <Link href={`/admin/crm/empresas/${company.id}`} className="text-link hover:underline">
              {company.name}
            </Link>
            {row.primaryContact && (
              <>
                <span className="text-faint"> · </span>
                contato principal: {row.primaryContact.name}
              </>
            )}
          </>
        }
        actions={
          <>
            <OpportunityFormDialog
              companyId={company.id}
              contacts={contacts.map((c) => ({ id: c.id, name: c.name }))}
              opportunity={{
                id: opp.id,
                title: opp.title,
                stage: opp.stage,
                valueCents: opp.valueCents,
                currency: opp.currency,
                expectedCloseAt: opp.expectedCloseAt,
                nextStep: opp.nextStep,
                nextStepAt: opp.nextStepAt,
                primaryContactId: opp.primaryContactId,
              }}
              trigger={<Button variant="secondary" size="sm" type="button">Editar</Button>}
            />
            {opp.stage === "won" && !linkedProject && (
              <CreateProjectDialog
                opportunityId={opp.id}
                defaultTitle={opp.title}
                valueCents={opp.valueCents}
                templates={templates.map((t) => ({
                  id: t.id,
                  name: t.name,
                  phaseCount: t.phaseCount,
                  deliverableCount: t.deliverableCount,
                }))}
                trigger={<Button size="sm" type="button">Criar projeto</Button>}
              />
            )}
            {linkedProject && (
              <Button variant="secondary" size="sm" render={<Link href={`/admin/projetos/${linkedProject.id}`} />}>
                Ver projeto ({linkedProject.status})
              </Button>
            )}
            {!isClosed && (
              <>
                <form action={changeOpportunityStageForm}>
                  <input type="hidden" name="id" value={opp.id} />
                  <input type="hidden" name="to" value="won" />
                  <Button type="submit" size="sm">Marcar como ganha</Button>
                </form>
                <LostDialog
                  opportunityId={opp.id}
                  trigger={<Button variant="destructive" size="sm" type="button">Marcar como perdida</Button>}
                />
              </>
            )}
            {isClosed && (
              <form action={changeOpportunityStageForm}>
                <input type="hidden" name="id" value={opp.id} />
                <input type="hidden" name="to" value="qualified" />
                <Button type="submit" variant="outline" size="sm">Reabrir (para qualificada)</Button>
              </form>
            )}
          </>
        }
      />

      <nav aria-label="Estágios" className="grid grid-cols-3 gap-1 md:grid-cols-6">
        {STAGES.map((s, i) => {
          const done = i < stageIndex && !isClosed;
          const active = s === opp.stage;
          return (
            <div
              key={s}
              className={cn(
                "flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-2.5 text-xs",
                done && "text-foreground",
                !done && !active && "text-muted-foreground",
                active && "border-signal-strong bg-signal-soft font-semibold text-foreground",
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full bg-strong",
                  done && "bg-link",
                  active && "bg-signal-strong",
                )}
              />
              {STAGE_LABEL[s]}
            </div>
          );
        })}
      </nav>

      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <Block title="Detalhes">
          <dl className="grid grid-cols-[160px_1fr] gap-y-2 text-sm">
            <dt className="text-muted-foreground">Valor</dt>
            <dd className="type-data">{formatBrlCents(opp.valueCents)}</dd>
            <dt className="text-muted-foreground">Previsão de fechamento</dt>
            <dd className="type-data">{formatIsoDate(opp.expectedCloseAt)}</dd>
            <dt className="text-muted-foreground">Próximo passo</dt>
            <dd>{opp.nextStep ?? <span className="text-faint">—</span>}</dd>
            <dt className="text-muted-foreground">Data do próximo passo</dt>
            <dd className="type-data">{formatIsoDate(opp.nextStepAt)}</dd>
            <dt className="text-muted-foreground">Criada em</dt>
            <dd className="type-data">{formatDate(opp.createdAt)}</dd>
            {opp.wonAt && (
              <>
                <dt className="text-muted-foreground">Ganha em</dt>
                <dd className="type-data">{formatDate(opp.wonAt)}</dd>
              </>
            )}
            {opp.lostAt && (
              <>
                <dt className="text-muted-foreground">Perdida em</dt>
                <dd className="type-data">{formatDate(opp.lostAt)}</dd>
                <dt className="text-muted-foreground">Motivo</dt>
                <dd>{opp.lostReason ?? <span className="text-faint">—</span>}</dd>
              </>
            )}
          </dl>
        </Block>

        <Block
          title="Propostas"
          aside={
            <ProposalFormDialog
              opportunityId={opp.id}
              trigger={<Button variant="secondary" size="sm" type="button">Nova proposta</Button>}
            />
          }
        >
          {proposals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma proposta ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {proposals.map((p) => (
                <li key={p.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      <Link href={`/admin/crm/propostas/${p.id}`} className="hover:text-link">
                        {p.title}
                      </Link>
                    </div>
                    <div className="type-micro text-muted-foreground">
                      <span className="type-data">{p.number}</span>
                      <span className="text-faint"> · </span>
                      {STATUS_LABEL[p.status]}
                      {p.sentAt && (
                        <>
                          <span className="text-faint"> · </span>
                          enviada em {formatDate(p.sentAt)}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="type-data shrink-0 text-right">{formatBrlCents(p.valueCents)}</div>
                </li>
              ))}
            </ul>
          )}
        </Block>
      </div>

      <Block
        title="Interações desta oportunidade"
        aside={
          <InteractionFormDialog
            opportunityId={opp.id}
            back={`/admin/crm/oportunidades/${opp.id}`}
            trigger={<Button variant="secondary" size="sm" type="button">Registrar interação</Button>}
          />
        }
      >
        {interactions.length === 0 ? (
          <EmptyState title="Nenhuma interação registrada." text="Registre a primeira ligação, e-mail, reunião ou nota." />
        ) : (
          <ol className="divide-y divide-border">
            {interactions.map((i) => (
              <li key={i.id} className="grid grid-cols-[110px_1fr] gap-5 py-4 first:pt-0 last:pb-0">
                <div className="type-micro text-muted-foreground">
                  {formatIsoDate(i.at)}
                  <div className="type-micro text-faint">
                    {new Date(i.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-[0.75rem] text-muted-foreground before:h-2 before:w-2 before:rounded-xs",
                        i.type === "call" && "before:bg-link",
                        i.type === "email" && "before:bg-signal",
                        i.type === "meeting" && "before:bg-success",
                        i.type === "note" && "before:bg-faint",
                      )}
                    >
                      {TYPE_LABEL[i.type]}
                    </span>
                    <span className="text-xs text-muted-foreground">· {i.byUserName}</span>
                  </div>
                  <div className="mt-1 text-sm font-medium">{i.summary}</div>
                  {i.body && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{i.body}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Block>
    </>
  );
}
