import Link from "next/link";
import { requireAdmin } from "@/modules/auth/context";
import { searchAll } from "@/modules/search/queries";
import { PageHeader, Block, EmptyState } from "@/components/shell/page-header";

export const metadata = { title: "Busca" };

export default async function BuscaPage({ searchParams }: PageProps<"/admin/busca">) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim();
  const groups = q.length >= 2 ? await searchAll(ctx, q) : [];
  const total = groups.reduce((s, g) => s + g.hits.length, 0);
  return (
    <>
      <PageHeader title={q ? `Busca: “${q}”` : "Busca"} meta={q.length < 2 ? "Digite ao menos 2 caracteres na caixa do topo." : `${total} resultado${total === 1 ? "" : "s"} em ${groups.length} grupo${groups.length === 1 ? "" : "s"}.`} />
      {q.length >= 2 && groups.length === 0 && <EmptyState title="Nada encontrado." text="A busca olha nome, e-mail, CNPJ, número de proposta e títulos de projetos, entregas, solicitações e atas." />}
      <div className="grid gap-6 xl:grid-cols-2">
        {groups.map((g) => (
          <Block key={g.key} title={g.label} aside={String(g.hits.length)} padded={false}>
            <ul className="divide-y divide-border">
              {g.hits.map((h) => (
                <li key={h.id}>
                  <Link href={h.href} className="grid gap-0.5 px-5 py-2.5 text-sm hover:bg-subtle">
                    <span className="font-medium">{h.label}</span>
                    {h.sub && <span className="type-micro text-muted-foreground">{h.sub}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </Block>
        ))}
      </div>
    </>
  );
}
