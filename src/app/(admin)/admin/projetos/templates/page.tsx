import Link from "next/link";
import { requireAdmin } from "@/modules/auth/context";
import { listTemplates } from "@/modules/projects/queries";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Templates de projeto" };

export default async function TemplatesListPage() {
  const ctx = await requireAdmin();
  const templates = await listTemplates(ctx);

  return (
    <>
      <PageHeader
        title="Templates de projeto"
        meta="Snapshot de fases + entregas. Reutilize na criação de um novo projeto para pular a estruturação inicial."
      />

      <div className="rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <strong className="font-medium text-foreground">Novo template?</strong> No detalhe de um projeto,
        clique em <strong className="font-medium text-foreground">Salvar como template</strong>. Templates
        são globais; guardam nome, descrição, e a estrutura de fases e entregas — sem status, prazo,
        responsável ou anexo.
      </div>

      {templates.length === 0 ? (
        <div className="rounded-md border border-border bg-card">
          <EmptyState
            title="Nenhum template ainda."
            text="Vá num projeto e clique em 'Salvar como template' para começar a biblioteca."
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <article key={t.id} className="flex flex-col gap-3 rounded-md border border-border bg-card p-5">
              <h3 className="text-base font-semibold">
                <Link href={`/admin/projetos/templates/${t.id}`} className="hover:text-link">
                  {t.name}
                </Link>
              </h3>
              {t.description && (
                <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                  {t.description}
                </p>
              )}
              <div className="mt-auto flex items-center gap-3 text-sm text-muted-foreground">
                <span>
                  <strong className="type-data mr-1 text-foreground">{t.phaseCount}</strong>
                  fases
                </span>
                <span>
                  <strong className="type-data mr-1 text-foreground">{t.deliverableCount}</strong>
                  entregas
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                <span>{t.ownerName} · {formatDate(new Date(t.createdAt))}</span>
                <Link href={`/admin/projetos/templates/${t.id}`} className="text-link hover:underline">
                  Detalhe
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
