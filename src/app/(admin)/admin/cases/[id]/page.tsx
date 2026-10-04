import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwner } from "@/modules/auth/context";
import { getCase } from "@/modules/cases/queries";
import { deleteCaseForm, updateCaseForm } from "@/modules/cases/form-actions";
import { CaseForm } from "@/modules/cases/components/case-form";
import { ConfirmAction } from "@/components/shell/confirm-action";
import { PageHeader, Block } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Case" };

export default async function CaseDetalhePage({ params }: PageProps<"/admin/cases/[id]">) {
  const ctx = await requireOwner();
  const { id } = await params;
  const c = await getCase(ctx, id);
  if (!c) notFound();

  return (
    <>
      <PageHeader
        title={c.name}
        meta={
          <>
            <Link href="/admin/cases" className="text-link hover:underline">Cases</Link>
            <span className="text-faint"> · </span>
            <span className="type-data">/cases#{c.slug}</span>
          </>
        }
        actions={
          <ConfirmAction
            trigger={<Button variant="destructive" size="sm">Excluir</Button>}
            title={`Excluir ${c.name}?`}
            description="O case some do site. Se só quiser tirá-lo do ar, despublique em vez de excluir."
            confirmLabel="Excluir"
            destructive
            action={deleteCaseForm}
            fields={{ id: c.id }}
          />
        }
      />
      <Block title="Dados">
        <CaseForm
          action={updateCaseForm}
          initial={{
            id: c.id,
            name: c.name,
            sector: c.sector,
            size: c.size,
            systems: c.systems,
            automations: c.automations,
            savingsCents: c.savingsCents,
            capexCents: c.capexCents,
            featured: c.featured,
            published: c.published,
            deliverables: c.deliverables,
            statusNote: c.statusNote,
          }}
        />
      </Block>
    </>
  );
}
