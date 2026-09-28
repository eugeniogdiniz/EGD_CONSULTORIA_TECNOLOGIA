import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/modules/auth/context";
import {
  getTemplate,
  listTemplatePhases,
  listTemplateDeliverables,
} from "@/modules/projects/queries";
import { deleteTemplateForm } from "@/modules/projects/form-actions";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { RenameTemplateDialog } from "@/modules/projects/components/template-form";

export const metadata = { title: "Template" };

export default async function TemplateDetailPage({ params }: PageProps<"/admin/projetos/templates/[id]">) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const template = await getTemplate(ctx, id);
  if (!template) notFound();

  const [phases, deliverables] = await Promise.all([
    listTemplatePhases(ctx, id),
    listTemplateDeliverables(ctx, id),
  ]);

  const noPhaseDels = deliverables.filter((d) => !d.phaseId);
  const groups = phases.map((p, i) => ({
    index: i + 1,
    phase: p,
    deliverables: deliverables.filter((d) => d.phaseId === p.id),
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={template.name}
        meta={
          <>
            <Link href="/admin/projetos/templates" className="text-link hover:underline">
              Templates
            </Link>
            <span className="text-faint"> · </span>
            {phases.length} fases · {deliverables.length} entregas
          </>
        }
        actions={
          <>
            <RenameTemplateDialog
              template={{ id: template.id, name: template.name, description: template.description }}
              trigger={<Button variant="secondary" size="sm" type="button">Renomear</Button>}
            />
            <form action={deleteTemplateForm}>
              <input type="hidden" name="id" value={template.id} />
              <Button type="submit" variant="destructive" size="sm">Deletar</Button>
            </form>
          </>
        }
      />

      {template.description && (
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {template.description}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {groups.length === 0 && noPhaseDels.length === 0 && (
          <p className="rounded-md border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
            Este template está vazio.
          </p>
        )}
        {groups.map((g) => (
          <section key={g.phase.id} className="rounded-md border border-border bg-card p-5">
            <div className="flex items-baseline gap-3 border-b border-border pb-3">
              <span className="type-data text-sm text-faint">{String(g.index).padStart(2, "0")}</span>
              <h3 className="text-base font-semibold">{g.phase.name}</h3>
              {g.phase.notes && <span className="text-xs text-faint">{g.phase.notes}</span>}
            </div>
            {g.deliverables.length === 0 ? (
              <p className="pt-3 text-sm text-muted-foreground">Sem entregas nesta fase.</p>
            ) : (
              <ul className="grid gap-2 pt-3">
                {g.deliverables.map((d) => (
                  <li key={d.id} className="grid grid-cols-[20px_1fr] items-baseline gap-2 text-sm">
                    <span className="text-faint">☐</span>
                    <div>
                      <span>{d.title}</span>
                      {d.description && (
                        <span className="type-micro ml-2 text-muted-foreground">— {d.description}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
        {noPhaseDels.length > 0 && (
          <section className="rounded-md border border-border bg-card p-5">
            <div className="flex items-baseline gap-3 border-b border-border pb-3">
              <span className="type-data text-sm text-faint">—</span>
              <h3 className="text-base font-semibold">Sem fase</h3>
            </div>
            <ul className="grid gap-2 pt-3">
              {noPhaseDels.map((d) => (
                <li key={d.id} className="grid grid-cols-[20px_1fr] items-baseline gap-2 text-sm">
                  <span className="text-faint">☐</span>
                  <div>
                    <span>{d.title}</span>
                    {d.description && (
                      <span className="type-micro ml-2 text-muted-foreground">— {d.description}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
