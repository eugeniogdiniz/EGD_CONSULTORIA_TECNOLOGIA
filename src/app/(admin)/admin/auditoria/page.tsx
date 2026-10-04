import { requireOwner } from "@/modules/auth/context";
import { listAudit } from "@/modules/audit/queries";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Auditoria" };

export default async function AuditoriaPage() {
  const ctx = await requireOwner();
  const rows = await listAudit(ctx, { limit: 200 });
  return (
    <>
      <PageHeader title="Auditoria" meta="Últimos 200 eventos: logins, convites, arquivos e alterações." />
      <div tabIndex={0} role="region" aria-label="Tabela, role horizontalmente se necessário" className="overflow-x-auto rounded-lg border border-border bg-card">
        {rows.length === 0 ? (
          <EmptyState title="Nenhum evento registrado." text="Ações no sistema aparecem aqui com quem fez e quando." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-subtle text-left text-muted-foreground">
                <th className="h-10 px-4 font-medium">Quando</th>
                <th className="h-10 px-4 font-medium">Ação</th>
                <th className="h-10 px-4 font-medium">Entidade</th>
                <th className="h-10 px-4 font-medium">Quem</th>
                <th className="h-10 px-4 font-medium">Organização</th>
                <th className="h-10 px-4 font-medium">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{formatDateTime(r.createdAt)}</td>
                  <td className="type-data px-4 py-2.5 whitespace-nowrap">{r.action}</td>
                  <td className="type-data px-4 py-2.5 text-faint">
                    {r.entityType} <span className="text-faint">{r.entityId.slice(0, 8)}</span>
                  </td>
                  <td className="type-data px-4 py-2.5 text-faint">{r.actorId ? r.actorId.slice(0, 8) : "sistema"}</td>
                  <td className="type-data px-4 py-2.5 text-faint">{r.organizationId ? r.organizationId.slice(0, 8) : "—"}</td>
                  <td className="max-w-[24rem] px-4 py-2.5">
                    <code className="block truncate text-[0.75rem] text-muted-foreground">{JSON.stringify(r.metadata)}</code>
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
