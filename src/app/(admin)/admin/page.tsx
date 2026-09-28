import Link from "next/link";
import { requireAdmin } from "@/modules/auth/context";
import { countNewLeads, listLeads } from "@/modules/leads/queries";
import { countOrganizations } from "@/modules/tenancy/queries";
import { PageHeader, Block, EmptyState } from "@/components/shell/page-header";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Painel" };

export default async function AdminHome() {
  const ctx = await requireAdmin();
  const [novos, orgs, ultimos] = await Promise.all([countNewLeads(), countOrganizations(), listLeads(ctx)]);
  return (
    <>
      <PageHeader title="Painel" meta={`Olá, ${ctx.user.name}.`} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-[240px_240px]">
        <Link href="/admin/leads" className="rounded-lg border border-border bg-card px-5 py-4 text-foreground hover:border-strong">
          <div className="text-sm font-medium text-muted-foreground">Leads novos</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{novos}</div>
        </Link>
        <Link href="/admin/organizacoes" className="rounded-lg border border-border bg-card px-5 py-4 text-foreground hover:border-strong">
          <div className="text-sm font-medium text-muted-foreground">Organizações</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{orgs}</div>
        </Link>
      </div>
      <Block title="Últimos leads" aside={<Link href="/admin/leads" className="text-link hover:text-signal-strong">Ver todos</Link>} padded={false}>
        {ultimos.length === 0 ? (
          <EmptyState title="Nenhum lead recebido pelo site ainda." text="Quando alguém enviar o formulário de contato, ele aparece aqui." />
        ) : (
          <ul className="divide-y divide-border">
            {ultimos.slice(0, 5).map((l) => (
              <li key={l.id} className="grid gap-1 px-5 py-3 text-sm md:grid-cols-[1fr_2fr_auto] md:items-center md:gap-4">
                <div className="font-medium">
                  {l.name}
                  {l.status === "new" && <span className="ml-2 inline-flex h-5 items-center rounded-sm bg-signal-soft px-1.5 text-[0.75rem] text-signal-strong">Novo</span>}
                </div>
                <div className="truncate text-muted-foreground">{l.message}</div>
                <div className="type-data text-faint">{formatDateTime(l.createdAt)}</div>
              </li>
            ))}
          </ul>
        )}
      </Block>
    </>
  );
}
