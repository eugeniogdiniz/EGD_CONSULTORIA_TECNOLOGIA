import Link from "next/link";
import { requireOwner } from "@/modules/auth/context";
import { listErrors } from "@/modules/errors/queries";
import { resolveErrorForm } from "@/modules/errors/form-actions";
import { PageHeader, Block, EmptyState } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { cn } from "cn";

export const metadata = { title: "Erros" };

export default async function ErrosPage({ searchParams }: PageProps<"/admin/erros">) {
  const ctx = await requireOwner();
  const sp = await searchParams;
  const resolved = sp.filtro === "resolvidos";
  const rows = await listErrors(ctx, { resolved });
  return (
    <>
      <PageHeader title="Erros do servidor" meta="Agrupados por origem. A referência é o mesmo código que a pessoa vê na tela de erro." />
      <nav className="flex gap-1 border-b border-border" aria-label="Filtro">
        {[
          { href: "/admin/erros", label: "Abertos", active: !resolved },
          { href: "/admin/erros?filtro=resolvidos", label: "Resolvidos", active: resolved },
        ].map((f) => (
          <Link key={f.href} href={f.href} aria-current={f.active ? "page" : undefined} className={cn("-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground", f.active && "border-foreground text-foreground")}>
            {f.label}
          </Link>
        ))}
      </nav>
      <Block title={resolved ? "Resolvidos" : "Abertos"} aside={`${rows.length} grupo${rows.length === 1 ? "" : "s"}`} padded={false}>
        {rows.length === 0 ? (
          <EmptyState title={resolved ? "Nenhum erro resolvido." : "Nenhum erro aberto."} text="Erros de renderização, rotas e server actions são registrados aqui automaticamente, com contagem por origem." />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((e) => (
              <li key={e.id} className="grid gap-2 px-5 py-4 text-sm md:grid-cols-[1fr_auto] md:items-start" data-testid={`erro-${e.fingerprint}`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium">{e.name}</span>
                    <span className="type-data text-xs text-faint">×{e.count}</span>
                    {e.digest && <span className="type-data text-xs text-muted-foreground">ref. {e.digest}</span>}
                  </div>
                  <p className="mt-1 break-words text-foreground">{e.message}</p>
                  <p className="type-micro mt-1 text-muted-foreground">
                    {e.method} {e.path} · {e.routeKind} · primeira vez {formatDateTime(e.firstSeenAt)} · última {formatDateTime(e.lastSeenAt)}
                  </p>
                  {e.stack && (
                    <details className="mt-2">
                      <summary className="type-micro cursor-pointer text-link">stack</summary>
                      <pre className="mt-1 max-h-64 overflow-auto rounded-sm bg-subtle p-3 text-[0.7rem] leading-relaxed">{e.stack}</pre>
                    </details>
                  )}
                </div>
                {!resolved && (
                  <form action={resolveErrorForm}>
                    <input type="hidden" name="id" value={e.id} />
                    <Button type="submit" size="sm" variant="outline">Resolver</Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </Block>
    </>
  );
}
