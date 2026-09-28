import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/modules/auth/context";
import {
  getCompany,
  listContactsByCompany,
  listInteractions,
  listOpportunities,
} from "@/modules/crm/queries";
import { toggleCompanyArchivedForm } from "@/modules/crm/form-actions";
import { PageHeader, Block, EmptyState } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { ContactFormDialog } from "@/modules/crm/components/contact-form";
import { formatDate, formatBrlCents, formatIsoDate } from "@/lib/format";
import { cn } from "cn";

const STAGE_LABEL: Record<string, string> = {
  new: "Novo",
  qualified: "Qualificado",
  meeting: "Reunião",
  proposal: "Proposta",
  won: "Ganho",
  lost: "Perdido",
};

const ROLE_LABEL: Record<string, string> = {
  primary: "Principal",
  technical: "Técnico",
  financial: "Financeiro",
  other: "Outro",
};

const TYPE_LABEL: Record<string, string> = {
  call: "Ligação",
  email: "E-mail",
  meeting: "Reunião",
  note: "Nota",
};

export default async function EmpresaDetalhePage({ params }: PageProps<"/admin/crm/empresas/[id]">) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const company = await getCompany(ctx, id);
  if (!company) notFound();

  const [contacts, opportunities, interactions] = await Promise.all([
    listContactsByCompany(ctx, id),
    listOpportunities(ctx, { companyId: id, includeClosed: true }),
    listInteractions(ctx, { companyId: id, limit: 20 }),
  ]);

  const archived = Boolean(company.archivedAt);

  return (
    <>
      <PageHeader
        title={company.name}
        meta={
          <>
            {archived ? (
              <span className="inline-flex items-center rounded-sm border border-border px-1.5 py-0.5 text-xs">
                Arquivada em {formatDate(company.archivedAt!)}
              </span>
            ) : (
              <span className="status status-ok">Ativa</span>
            )}
            <span className="text-faint"> · </span>
            <span className="type-data">{company.slug}</span>
            <span className="text-faint"> · </span>
            criada em {formatDate(company.createdAt)}
          </>
        }
        actions={
          <>
            <Button variant="secondary" size="sm" render={<Link href={`/admin/crm/empresas/${company.id}/editar`} />}>
              Editar
            </Button>
            <form action={toggleCompanyArchivedForm}>
              <input type="hidden" name="id" value={company.id} />
              <input type="hidden" name="archived" value={archived ? "1" : "0"} />
              <Button type="submit" variant={archived ? "outline" : "destructive"} size="sm">
                {archived ? "Desarquivar" : "Arquivar"}
              </Button>
            </form>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr_1fr]">
        <Block title="Dados">
          <dl className="grid grid-cols-[130px_1fr] gap-y-2 text-sm">
            <dt className="text-muted-foreground">CNPJ</dt>
            <dd className="type-data">{company.cnpj ?? <span className="text-faint">—</span>}</dd>
            <dt className="text-muted-foreground">Site</dt>
            <dd>
              {company.website ? (
                <a
                  href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-link hover:underline"
                >
                  {company.website}
                </a>
              ) : (
                <span className="text-faint">—</span>
              )}
            </dd>
            <dt className="text-muted-foreground">Setor</dt>
            <dd>{company.industry ?? <span className="text-faint">—</span>}</dd>
            <dt className="text-muted-foreground">Tamanho</dt>
            <dd>{company.size ?? <span className="text-faint">—</span>}</dd>
            <dt className="text-muted-foreground">Origem</dt>
            <dd>{company.source}</dd>
            <dt className="text-muted-foreground">Portal</dt>
            <dd>
              {company.linkedOrganizationId ? (
                <Link href={`/admin/organizacoes/${company.linkedOrganizationId}`} className="text-link hover:underline">
                  Vinculada
                </Link>
              ) : (
                <span className="text-faint">não vinculada</span>
              )}
            </dd>
          </dl>
          {company.notes && (
            <div className="type-micro mt-4 max-w-lg leading-relaxed text-muted-foreground">{company.notes}</div>
          )}
        </Block>

        <Block
          title="Contatos"
          aside={
            <ContactFormDialog
              companyId={company.id}
              trigger={<Button variant="secondary" size="sm" type="button">Adicionar contato</Button>}
            />
          }
        >
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum contato ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {contacts.map((c) => (
                <li key={c.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{c.name}</span>
                      <span
                        className={cn(
                          "inline-flex h-5 items-center rounded-sm border border-border px-1.5 text-[0.75rem] text-muted-foreground",
                          c.role === "primary" && "border-link bg-link-soft text-link",
                        )}
                      >
                        {ROLE_LABEL[c.role]}
                      </span>
                    </div>
                    <div className="type-data mt-0.5 text-muted-foreground">
                      {c.email ?? <span className="text-faint">sem e-mail</span>}
                      {c.phone && (
                        <>
                          <span className="text-faint"> · </span>
                          {c.phone}
                        </>
                      )}
                    </div>
                  </div>
                  <ContactFormDialog
                    companyId={company.id}
                    contact={c}
                    trigger={<button type="button" className="text-xs text-link hover:underline">Editar</button>}
                  />
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block
          title="Oportunidades"
          aside={
            <span>
              {opportunities.filter((o) => o.stage !== "won" && o.stage !== "lost").length} abertas
            </span>
          }
        >
          {opportunities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma oportunidade ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {opportunities.map((o) => (
                <li key={o.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      <Link href={`/admin/crm/oportunidades/${o.id}`} className="hover:text-link">
                        {o.title}
                      </Link>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {STAGE_LABEL[o.stage]}
                      {o.nextStep && (
                        <>
                          <span className="text-faint"> · </span>
                          próximo: {o.nextStep}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="type-data shrink-0 text-right">{formatBrlCents(o.valueCents)}</div>
                </li>
              ))}
            </ul>
          )}
        </Block>
      </div>

      <Block title="Interações">
        {interactions.length === 0 ? (
          <EmptyState title="Nenhuma interação registrada." text="Ligações, e-mails, reuniões e notas aparecem aqui." />
        ) : (
          <ol className="divide-y divide-border">
            {interactions.map((i) => (
              <li key={i.id} className="grid grid-cols-[110px_1fr] gap-5 py-4 first:pt-0 last:pb-0">
                <div className="type-micro text-muted-foreground">
                  {formatIsoDate(i.at)}
                  <div className="type-micro text-faint">{new Date(i.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}</div>
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
        <p className="type-micro mt-4 text-faint">Registrar interação: em breve na próxima release.</p>
      </Block>
    </>
  );
}
