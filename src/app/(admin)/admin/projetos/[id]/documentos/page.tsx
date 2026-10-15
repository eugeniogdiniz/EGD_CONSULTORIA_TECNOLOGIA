import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { requireAdmin } from "@/modules/auth/context";
import { getProject } from "@/modules/projects/queries";
import { getProjectDocuments, type DocumentSource } from "@/modules/project-documents/queries";
import { deleteDocumentForm } from "@/modules/project-documents/form-actions";
import { UploadDocumentsForm } from "@/modules/project-documents/components/upload-documents-form";
import { FolderDialog } from "@/modules/project-documents/components/folder-dialog";
import { DocumentDialog } from "@/modules/project-documents/components/document-dialog";
import { ConfirmAction } from "@/components/shell/confirm-action";
import { PageHeader, Block, EmptyState } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDateTime } from "@/lib/format";

export const metadata = { title: "Documentos do projeto" };

const SOURCE_LABEL: Record<DocumentSource, string> = {
  upload: "Enviado",
  proposal: "Proposta",
  contract: "Contrato",
  contract_signed: "Contrato",
  deliverable: "Entrega",
  acceptance: "Aceite",
};

export default async function ProjetoDocumentosPage({ params, searchParams }: PageProps<"/admin/projetos/[id]/documentos">) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const [row, ged] = await Promise.all([getProject(ctx, id), getProjectDocuments(ctx, id)]);
  if (!row || !ged) notFound();
  const p = row.project;
  const archived = Boolean(p.archivedAt);

  const pasta = typeof sp.pasta === "string" ? sp.pasta : null;
  const current = ged.folders.find((f) => f.id === pasta) ?? null;
  const docs = current ? ged.documents.filter((d) => d.folderId === current.id) : ged.documents;
  const folderName = new Map(ged.folders.map((f) => [f.id, f.name]));
  const folderOptions = ged.folders.map((f) => ({ id: f.id, name: f.name }));
  const base = `/admin/projetos/${p.id}/documentos`;
  const linkClass = "font-medium text-link underline decoration-1 underline-offset-[3px] hover:text-signal-strong";

  return (
    <>
      <PageHeader
        title={`Documentos · ${p.title}`}
        meta={row.company.name}
        actions={
          archived ? null : (
            <FolderDialog projectId={p.id} trigger={<Button variant="secondary" size="sm" type="button">Nova pasta</Button>} />
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Pastas do projeto" className="flex flex-col gap-0.5 self-start rounded-lg border border-border bg-card p-2">
          <FolderLink href={base} active={!current} label="Todos os documentos" count={ged.documents.length} />
          <div className="my-1 border-t border-border" />
          {ged.folders.map((f) => (
            <FolderLink
              key={f.id}
              href={`${base}?pasta=${f.id}`}
              active={current?.id === f.id}
              label={f.name}
              count={f.count}
              shared={f.visibleToClient}
            />
          ))}
        </nav>

        <div className="flex flex-col gap-6">
          {current && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm">
              <span className="font-semibold">{current.name}</span>
              <span className={cn("inline-flex h-6 items-center rounded-sm border px-2 text-[0.75rem] font-medium", current.visibleToClient ? "border-link bg-link-soft text-link" : "border-border bg-subtle text-muted-foreground")}>
                {current.visibleToClient ? "Cliente vê" : "Interna"}
              </span>
              <span className="text-muted-foreground">
                {current.visibleToClient
                  ? "Tudo nesta pasta aparece no portal do cliente."
                  : "Só a equipe vê esta pasta."}
              </span>
              {!archived && (
                <FolderDialog
                  projectId={p.id}
                  folder={current}
                  trigger={<button type="button" className="ml-auto text-xs text-link hover:underline">Editar pasta</button>}
                />
              )}
            </div>
          )}

          {!archived && (
            <Block title="Enviar documentos" aside="até 20 arquivos de 50 MB por vez">
              <UploadDocumentsForm projectId={p.id} folders={folderOptions} defaultFolderId={current?.id ?? null} />
            </Block>
          )}

          <div tabIndex={0} role="region" aria-label="Documentos, role horizontalmente se necessário" className="overflow-x-auto rounded-lg border border-border bg-card">
            {docs.length === 0 ? (
              <EmptyState
                title={current ? `Nenhum documento em ${current.name}.` : "Nenhum documento no projeto."}
                text="Envie arquivos pelo formulário acima. Propostas, contratos e arquivos de entrega aparecem aqui sozinhos."
              />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-subtle text-left text-muted-foreground">
                    <th className="h-10 px-4 font-medium">Documento</th>
                    {!current && <th className="h-10 px-4 font-medium">Pasta</th>}
                    <th className="h-10 px-4 font-medium">Origem</th>
                    <th className="h-10 px-4 text-right font-medium">Tamanho</th>
                    <th className="h-10 px-4 font-medium">Data</th>
                    <th className="h-10 px-4"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.key} className="border-t border-border align-top hover:bg-subtle">
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{d.title}</div>
                        <div className="type-micro text-muted-foreground">
                          {d.fileName}
                          {d.detail ? ` · ${d.detail}` : ""}
                        </div>
                        {d.notes && <div className="mt-1 max-w-prose text-xs whitespace-pre-wrap text-muted-foreground">{d.notes}</div>}
                      </td>
                      {!current && <td className="px-4 py-2.5 whitespace-nowrap">{folderName.get(d.folderId)}</td>}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {d.originHref ? (
                          <Link href={d.originHref} className="text-link hover:underline">{SOURCE_LABEL[d.source]}</Link>
                        ) : (
                          <span className="text-muted-foreground">{SOURCE_LABEL[d.source]}{d.uploadedByName ? ` por ${d.uploadedByName}` : ""}</span>
                        )}
                      </td>
                      <td className="type-data px-4 py-2.5 text-right whitespace-nowrap">{formatBytes(d.sizeBytes)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{formatDateTime(d.createdAt)}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-3">
                          <a href={`/admin/arquivos/${d.fileId}/baixar`} target="_blank" rel="noopener" className={linkClass}>
                            Baixar
                          </a>
                          {d.documentId && !archived && (
                            <>
                              <DocumentDialog
                                projectId={p.id}
                                doc={{ id: d.documentId, title: d.title, notes: d.notes, folderId: d.folderId }}
                                folders={folderOptions}
                                trigger={<button type="button" className="text-xs text-link hover:underline">Editar</button>}
                              />
                              <ConfirmAction
                                trigger={<button type="button" className="text-xs text-danger hover:underline">Excluir</button>}
                                title="Excluir documento?"
                                description={`"${d.title}" sai do projeto e o arquivo é apagado. Não dá para desfazer.`}
                                confirmLabel="Excluir"
                                action={deleteDocumentForm}
                                fields={{ id: d.documentId }}
                              />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function FolderLink({ href, active, label, count, shared }: { href: string; active: boolean; label: string; count: number; shared?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-subtle hover:text-foreground",
        active && "bg-subtle font-medium text-foreground",
      )}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {shared && <span className="type-micro text-link" title="O cliente vê esta pasta">cliente</span>}
      <span className="type-data text-xs text-faint">{count}</span>
    </Link>
  );
}
