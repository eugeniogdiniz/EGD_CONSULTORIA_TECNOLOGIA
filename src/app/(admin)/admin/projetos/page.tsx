import Link from "next/link";
import { cn } from "cn";
import { requireAdmin } from "@/modules/auth/context";
import { listProjects } from "@/modules/projects/queries";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { formatDate, formatIsoDate } from "@/lib/format";

export const metadata = { title: "Projetos" };

const STATUS_LABEL: Record<string, string> = {
  planning: "Planejamento",
  active: "Em execução",
  on_hold: "Em espera",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const STATUS_STYLE: Record<string, string> = {
  planning: "border-border bg-subtle text-muted-foreground",
  active: "border-link bg-link-soft text-link",
  on_hold: "border-warning bg-warning-soft text-warning",
  delivered: "border-success bg-success-soft text-success",
  cancelled: "border-danger bg-danger-soft text-danger",
};

const FILTERS = [
  { key: "all", label: "Todos" },
  { key: "active", label: "Ativos" },
  { key: "planning", label: "Planejamento" },
  { key: "on_hold", label: "Em espera" },
  { key: "delivered", label: "Entregues" },
  { key: "cancelled", label: "Cancelados" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default async function ProjetosPage({ searchParams }: PageProps<"/admin/projetos">) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const status: FilterKey = FILTERS.find((f) => f.key === sp.status)?.key ?? "all";
  const search = typeof sp.q === "string" ? sp.q : "";
  const includeArchived = sp.archived === "1";

  const rows = await listProjects(ctx, {
    status: status === "all" ? undefined : (status as Exclude<FilterKey, "all">),
    search: search || undefined,
    includeArchived,
  });

  return (
    <>
      <PageHeader
        title="Projetos"
        meta="Execução dos negócios ganhos. Projetos novos nascem no CRM: abra uma oportunidade Ganha e clique em Criar projeto."
      />

      <nav className="flex gap-1 border-b border-border" aria-label="Filtro por status">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/projetos?status=${f.key}${search ? `&q=${encodeURIComponent(search)}` : ""}${includeArchived ? "&archived=1" : ""}`}
            aria-current={status === f.key ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground",
              status === f.key && "border-foreground text-foreground",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      <form className="flex flex-wrap items-center gap-3" action="/admin/projetos">
        <input type="hidden" name="status" value={status} />
        <div className="grow max-w-md">
          <label htmlFor="q" className="sr-only">Buscar</label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Buscar por título ou empresa"
            className="h-10 w-full rounded-sm border border-input bg-card px-3 text-sm"
          />
        </div>
        <label className="inline-flex h-10 items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" name="archived" value="1" defaultChecked={includeArchived} />
          Mostrar arquivados
        </label>
        <button type="submit" className="h-10 rounded-sm border border-input px-3 text-sm hover:bg-muted">Filtrar</button>
      </form>

      <div tabIndex={0} role="region" aria-label="Tabela, role horizontalmente se necessário" className="overflow-x-auto rounded-lg border border-border bg-card">
        {rows.length === 0 ? (
          <EmptyState
            title={search ? "Nenhum projeto bate com essa busca." : "Nenhum projeto ainda."}
            text="Projetos são criados a partir de oportunidades Ganhas no CRM. Não há botão de criação aqui."
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-subtle text-left text-muted-foreground">
                <th className="h-10 px-4 font-medium">Título</th>
                <th className="h-10 px-4 font-medium">Empresa</th>
                <th className="h-10 px-4 font-medium">Status</th>
                <th className="h-10 px-4 font-medium">Iniciado</th>
                <th className="h-10 px-4 font-medium">Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={cn("border-t border-border align-top", r.archivedAt && "text-muted-foreground")}>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    <Link href={`/admin/projetos/${r.id}`} className="hover:text-link">
                      {r.title}
                    </Link>
                    {r.archivedAt && (
                      <span className="ml-2 inline-flex h-5 items-center rounded-sm border border-border px-1.5 text-[0.75rem] text-muted-foreground">
                        arquivado
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/crm/empresas/${r.companyId}`} className="text-link hover:underline">
                      {r.companyName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex h-6 items-center rounded-sm border px-2 text-[0.75rem] font-medium",
                        STATUS_STYLE[r.status],
                      )}
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="type-data px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {formatIsoDate(r.startedAt)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDate(r.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
