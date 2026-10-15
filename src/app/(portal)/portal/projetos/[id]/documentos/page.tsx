import { notFound } from "next/navigation";
import { requirePortal } from "@/modules/auth/context";
import { getPortalProject } from "@/modules/portal-projects/queries";
import { getPortalProjectDocuments } from "@/modules/project-documents/queries";
import { PageHeader, Block, EmptyState } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDate } from "@/lib/format";

export const metadata = { title: "Documentos" };

export default async function PortalDocumentosPage({ params }: PageProps<"/portal/projetos/[id]/documentos">) {
  const ctx = await requirePortal();
  const { id } = await params;
  const [project, ged] = await Promise.all([getPortalProject(ctx, id), getPortalProjectDocuments(ctx, id)]);
  if (!project || !ged) notFound();
  const withDocs = ged.folders.filter((f) => f.count > 0);

  return (
    <>
      <PageHeader
        title={`Documentos — ${project.title}`}
        meta="Propostas, contratos, entregas e demais documentos que a EGD compartilhou neste projeto."
      />
      {withDocs.length === 0 ? (
        <EmptyState title="Nenhum documento compartilhado ainda." text="Quando a equipe compartilhar documentos do projeto, eles aparecem aqui." />
      ) : (
        <div className="flex flex-col gap-6">
          {withDocs.map((f) => (
            <Block key={f.id} title={f.name} aside={f.count === 1 ? "1 documento" : `${f.count} documentos`}>
              <ul className="divide-y divide-border">
                {ged.documents
                  .filter((d) => d.folderId === f.id)
                  .map((d) => (
                    <li key={d.key} className="flex items-center gap-3.5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{d.title}</div>
                        <div className="type-micro text-muted-foreground">
                          {d.fileName} · {formatBytes(d.sizeBytes)} · {formatDate(d.createdAt)}
                          {d.detail ? ` · ${d.detail}` : ""}
                        </div>
                        {d.notes && <div className="mt-1 text-xs whitespace-pre-wrap text-muted-foreground">{d.notes}</div>}
                      </div>
                      <form method="post" action={`/portal/projetos/${id}/documentos/baixar`}>
                        <input type="hidden" name="fileId" value={d.fileId} />
                        <Button type="submit" variant="outline" size="sm">Baixar</Button>
                      </form>
                    </li>
                  ))}
              </ul>
            </Block>
          ))}
          <p className="type-micro text-faint">O download abre um link temporário e fica registrado no histórico da EGD.</p>
        </div>
      )}
    </>
  );
}
