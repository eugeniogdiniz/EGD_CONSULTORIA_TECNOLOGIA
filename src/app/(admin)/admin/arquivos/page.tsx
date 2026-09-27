import { requireAdmin } from "@/modules/auth/context";
import { listFiles } from "@/modules/files/queries";
import { listOrganizations } from "@/modules/tenancy/queries";
import { UploadForm } from "@/modules/files/components/upload-form";
import { PageHeader, Block, EmptyState } from "@/components/shell/page-header";
import { formatBytes, formatDateTime } from "@/lib/format";

export const metadata = { title: "Arquivos" };

export default async function ArquivosPage() {
  const ctx = await requireAdmin();
  const [files, orgs] = await Promise.all([listFiles(ctx), listOrganizations(ctx)]);
  const orgName = new Map(orgs.map((o) => [o.id, o.name]));

  return (
    <>
      <PageHeader title="Arquivos" meta="Arquivos internos e por organização. Download sempre por link temporário." />
      <Block title="Enviar arquivo" aside="máximo 50 MB">
        <UploadForm organizations={orgs.filter((o) => o.status === "active").map((o) => ({ id: o.id, name: o.name }))} />
      </Block>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        {files.length === 0 ? (
          <EmptyState title="Nenhum arquivo enviado." text="Envie o primeiro pelo formulário acima." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-subtle text-left text-muted-foreground">
                <th className="h-10 px-4 font-medium">Nome</th>
                <th className="h-10 px-4 text-right font-medium">Tamanho</th>
                <th className="h-10 px-4 font-medium">Organização</th>
                <th className="h-10 px-4 font-medium">Enviado em</th>
                <th className="h-10 px-4" />
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id} className="border-t border-border hover:bg-subtle">
                  <td className="h-11 px-4 font-medium">{f.originalName}</td>
                  <td className="type-data h-11 px-4 text-right">{formatBytes(f.sizeBytes)}</td>
                  <td className="h-11 px-4">{f.organizationId ? (orgName.get(f.organizationId) ?? "—") : <span className="text-muted-foreground">Interno</span>}</td>
                  <td className="h-11 px-4 text-muted-foreground">{formatDateTime(f.createdAt)}</td>
                  <td className="h-11 px-4 text-right">
                    <a
                      href={`/admin/arquivos/${f.id}/baixar`}
                      target="_blank"
                      rel="noopener"
                      className="font-medium text-link underline decoration-1 underline-offset-[3px] hover:text-signal-strong"
                    >
                      Baixar
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
