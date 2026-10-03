import Link from "next/link";
import { cn } from "cn";
import { requireOwner } from "@/modules/auth/context";
import { listAllCases } from "@/modules/cases/queries";
import { SIZE_LABEL } from "@/modules/cases/public";
import { toggleCasePublishedForm } from "@/modules/cases/form-actions";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { formatBrlCents } from "@/lib/format";

export const metadata = { title: "Cases" };

export default async function AdminCasesPage() {
  const ctx = await requireOwner();
  const cases = await listAllCases(ctx);
  const published = cases.filter((c) => c.published).length;

  return (
    <>
      <PageHeader
        title="Cases"
        meta={`${cases.length} cases, ${published} publicados. Os cases estão ocultos no site público por enquanto; a API continua lendo esta lista.`}
        actions={
          <Button size="sm" render={<Link href="/admin/cases/novo" />}>
            Novo case
          </Button>
        }
      />
      <div tabIndex={0} role="region" aria-label="Tabela, role horizontalmente se necessário" className="overflow-x-auto rounded-lg border border-border bg-card">
        {cases.length === 0 ? (
          <EmptyState title="Nenhum case ainda." text="Crie o primeiro para ele aparecer em /cases." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-subtle text-left text-muted-foreground">
                <th className="h-10 px-4 font-medium">Cliente</th>
                <th className="h-10 px-4 font-medium">Setor</th>
                <th className="h-10 px-4 font-medium">Porte</th>
                <th className="h-10 px-4 text-right font-medium">Sist.</th>
                <th className="h-10 px-4 text-right font-medium">Autom.</th>
                <th className="h-10 px-4 text-right font-medium">Economia anual</th>
                <th className="h-10 px-4 font-medium">Status</th>
                <th className="h-10 px-4"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} className={cn("border-t border-border", !c.published && "text-muted-foreground")}>
                  <td className="px-4 py-2.5 font-medium">
                    <Link href={`/admin/cases/${c.id}`} className="hover:text-link">{c.name}</Link>
                    {c.featured && (
                      <span className="ml-2 rounded-sm border border-link bg-link-soft px-1.5 text-[0.7rem] text-link">destaque</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">{c.sector}</td>
                  <td className="px-4 py-2.5">{SIZE_LABEL[c.size]}</td>
                  <td className="type-data px-4 py-2.5 text-right">{c.systems}</td>
                  <td className="type-data px-4 py-2.5 text-right">{c.automations}</td>
                  <td className="type-data px-4 py-2.5 text-right">{c.savingsCents ? formatBrlCents(c.savingsCents) : "—"}</td>
                  <td className="px-4 py-2.5">
                    {c.published ? "Publicado" : "Rascunho"}
                    {c.statusNote && <span className="type-micro ml-2 text-faint">{c.statusNote}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <form action={toggleCasePublishedForm}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="published" value={c.published ? "0" : "1"} />
                      <button type="submit" className="text-xs text-link hover:underline">
                        {c.published ? "Despublicar" : "Publicar"}
                      </button>
                    </form>
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
